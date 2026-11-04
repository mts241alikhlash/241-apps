import { computed, onUnmounted, ref, shallowRef } from 'vue'
import { studentExamService } from '../services/studentExamService'
import {
  createServerClock,
  secondsUntilSubmitAllowed,
} from '../logic/examClock'
import { formatRemaining, isAnswered } from '../logic/exam'
import {
  SYNC_DEBOUNCE_MS,
  SYNC_INTERVAL_MS,
  answeredCount as countAnsweredRows,
  clearRows,
  loadRows,
  pendingRows,
  prepareSubmit,
  recordAnswer,
  saveRows,
  syncLabel,
  syncPendingAnswers,
  syncSummary,
  type AnswerRow,
} from '../logic/answerSync'
import type { AnswerPayload, PaperQuestion } from '../types'

export interface UseExamSessionOptions {
  onExpired?: () => void
  isOnline?: () => boolean
  newClientId?: () => string
  storage?: () => Storage
  monotonic?: () => number
}

export function useExamSession(options: UseExamSessionOptions = {}) {
  const questions = ref<PaperQuestion[]>([])
  const answers = ref(new Map<string, AnswerPayload>())
  const rows = shallowRef(new Map<string, AnswerRow>())
  const loading = ref(true)
  const error = ref<string | null>(null)
  const submitted = ref(false)
  const submitting = ref(false)
  const remaining = ref(0)
  const submitGateSeconds = ref(0)

  const newClientId = options.newClientId ?? (() => crypto.randomUUID())
  const isOnline = options.isOnline ?? (() => navigator.onLine)
  const storage = options.storage ?? (() => window.localStorage)
  const clock = createServerClock(
    options.monotonic ?? (() => performance.now()),
  )

  let sessionId = ''
  let deadline = 0
  let startedAt = ''
  let minSubmitMinutes = 0
  let ticker: ReturnType<typeof setInterval> | null = null
  let syncTicker: ReturnType<typeof setInterval> | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let syncing = false

  const answeredCount = computed(() => countAnsweredRows(rows.value))
  const remainingLabel = computed(() => formatRemaining(remaining.value))
  const expired = computed(() => remaining.value <= 0)
  const sync = computed(() => syncSummary(rows.value))
  const syncSummaryLabel = computed(() => syncLabel(sync.value))
  const submitGateMinutes = computed(() =>
    Math.ceil(submitGateSeconds.value / 60),
  )
  const canSubmit = computed(
    () =>
      !submitting.value && !submitted.value && submitGateSeconds.value === 0,
  )
  const answersLocked = computed(() => submitting.value || submitted.value)

  function publish(next: Map<string, AnswerRow>) {
    rows.value = new Map(next)
    if (sessionId) saveRows(storage(), sessionId, rows.value)
  }

  function refreshGate() {
    submitGateSeconds.value = secondsUntilSubmitAllowed(
      startedAt,
      minSubmitMinutes,
      deadline,
      clock.now(),
    )
  }

  function startClock(nextDeadline: number, serverTime: number | string) {
    deadline = nextDeadline
    clock.sync(serverTime)
    const tick = () => {
      remaining.value = Math.max(0, deadline - clock.now())
      refreshGate()
      if (remaining.value <= 0) {
        stopClock()
        options.onExpired?.()
      }
    }
    tick()
    stopClock()
    ticker = setInterval(tick, 1000)
  }

  function stopClock() {
    clearInterval(ticker ?? undefined)
    ticker = null
  }

  async function load(nextSessionId: string) {
    sessionId = nextSessionId
    loading.value = true
    error.value = null
    try {
      const [paper, saved] = await Promise.all([
        studentExamService.getQuestions(nextSessionId),
        studentExamService.getAnswers(nextSessionId),
      ])
      questions.value = paper.questions
      startedAt = paper.startedAt
      minSubmitMinutes = paper.minSubmitMinutes
      if (paper.serverTime) clock.sync(paper.serverTime)
      refreshGate()
      const restored = new Map<string, AnswerPayload>()
      const restoredRows = new Map<string, AnswerRow>()
      for (const row of saved) {
        if (!row.answer) continue
        restored.set(row.questionId, row.answer)
        restoredRows.set(row.questionId, {
          questionId: row.questionId,
          clientId: newClientId(),
          answer: row.answer,
          updatedAtMillis: Date.now(),
          syncState: 'SERVER_CONFIRMED',
          confirmedAtMillis: Date.now(),
        })
      }
      for (const row of loadRows(storage(), nextSessionId).values()) {
        if (row.syncState === 'SERVER_CONFIRMED') continue
        restoredRows.set(row.questionId, row)
        restored.set(row.questionId, row.answer)
      }
      answers.value = restored
      publish(restoredRows)
      startAutoSync()
    } catch (cause) {
      error.value =
        cause instanceof Error ? cause.message : 'Soal gagal dimuat.'
    } finally {
      loading.value = false
    }
  }

  function startAutoSync() {
    stopAutoSync()
    syncTicker = setInterval(() => void syncNow(), SYNC_INTERVAL_MS)
  }

  function stopAutoSync() {
    clearInterval(syncTicker ?? undefined)
    syncTicker = null
    clearTimeout(debounceTimer ?? undefined)
    debounceTimer = null
  }

  function scheduleSync() {
    clearTimeout(debounceTimer ?? undefined)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void syncNow()
    }, SYNC_DEBOUNCE_MS)
  }

  function onConnectivityChanged(online: boolean) {
    if (!online || submitted.value) return
    scheduleSync()
  }

  async function syncNow() {
    if (syncing || submitted.value || !sessionId) return
    if (pendingRows(rows.value).length === 0) return
    if (!isOnline()) return
    syncing = true
    try {
      await syncPendingAnswers(
        rows.value,
        sessionId,
        studentExamService,
        Date.now,
        newClientId,
      )
      error.value = null
    } catch (cause) {
      error.value =
        cause instanceof Error ? cause.message : 'Jawaban gagal disimpan.'
    } finally {
      syncing = false
      publish(rows.value)
    }
  }

  function answer(question: PaperQuestion, payload: AnswerPayload): boolean {
    if (answersLocked.value) return false
    answers.value = new Map(answers.value).set(question.id, payload)
    recordAnswer(rows.value, question.id, payload, Date.now(), newClientId)
    publish(rows.value)
    scheduleSync()
    return true
  }

  async function submit(targetSessionId: string) {
    if (submitting.value) throw new Error('Pengumpulan sedang berjalan.')
    submitting.value = true
    try {
      const request = await prepareSubmit(
        rows.value,
        targetSessionId,
        studentExamService,
        Date.now,
        newClientId,
      )
      const pending = pendingRows(rows.value)
      publish(rows.value)
      const result = await studentExamService.submit(targetSessionId, request)
      if (result.answersStored) {
        const confirmedAt = Date.now()
        for (const row of pending) {
          const current = rows.value.get(row.questionId)
          if (current?.clientId !== row.clientId) continue
          rows.value.set(row.questionId, {
            ...current,
            syncState: 'SERVER_CONFIRMED',
            confirmedAtMillis: confirmedAt,
          })
        }
      }
      publish(rows.value)
      if (pendingRows(rows.value).length === 0) {
        clearRows(storage(), targetSessionId)
      }
      submitted.value = true
      stopClock()
      stopAutoSync()
      return result
    } finally {
      submitting.value = false
    }
  }

  onUnmounted(() => {
    stopClock()
    stopAutoSync()
  })

  return {
    questions,
    answers,
    loading,
    error,
    submitted,
    submitting,
    remaining,
    remainingLabel,
    answeredCount,
    expired,
    submitGateSeconds,
    submitGateMinutes,
    canSubmit,
    answersLocked,
    sync,
    syncSummaryLabel,
    startClock,
    stopClock,
    load,
    answer,
    submit,
    syncNow,
    onConnectivityChanged,
    isAnswered,
  }
}
