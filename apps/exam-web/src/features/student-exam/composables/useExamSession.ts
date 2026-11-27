import { computed, onUnmounted, ref, shallowRef } from 'vue'
import {
  API_ERROR_CODES,
  ExamApiError,
  studentExamService,
} from '../services/studentExamService'
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
  onTokenReentry?: () => void
  onDeadlineChanged?: (deadline: number, serverTime: string) => void
}

const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000

export function useExamSession(options: UseExamSessionOptions = {}) {
  const questions = ref<PaperQuestion[]>([])
  const answers = ref(new Map<string, AnswerPayload>())
  const rows = shallowRef(new Map<string, AnswerRow>())
  const loading = ref(true)
  const error = ref<string | null>(null)
  const errorCode = ref<string | null>(null)
  const submitted = ref(false)
  const submitting = ref(false)
  const remaining = ref(0)
  const submitGateSeconds = ref(0)
  const timeUp = ref(false)

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
  let heartbeatTicker: ReturnType<typeof setInterval> | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let syncing = false

  const answeredCount = computed(() => countAnsweredRows(rows.value))
  const remainingLabel = computed(() => formatRemaining(remaining.value))
  const expired = computed(() => timeUp.value)
  const sync = computed(() => syncSummary(rows.value))
  const syncSummaryLabel = computed(() => syncLabel(sync.value))
  const submitGateMinutes = computed(() =>
    Math.ceil(submitGateSeconds.value / 60),
  )
  const canSubmit = computed(
    () =>
      !submitting.value && !submitted.value && submitGateSeconds.value === 0,
  )
  const answersLocked = computed(
    () => submitting.value || submitted.value || timeUp.value,
  )

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
      if (remaining.value <= 0) expire()
    }
    tick()
    stopClock()
    ticker = setInterval(tick, 1000)
  }

  function expire() {
    stopClock()
    stopAutoSync()
    remaining.value = 0
    if (timeUp.value) return
    timeUp.value = true
    options.onExpired?.()
  }

  function stopClock() {
    clearInterval(ticker ?? undefined)
    ticker = null
  }

  async function load(nextSessionId: string) {
    sessionId = nextSessionId
    loading.value = true
    error.value = null
    errorCode.value = null
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
      errorCode.value = cause instanceof ExamApiError ? cause.code : null
      error.value =
        cause instanceof Error ? cause.message : 'Soal gagal dimuat.'
    } finally {
      loading.value = false
    }
  }

  function startAutoSync() {
    stopAutoSync()
    if (timeUp.value) return
    syncTicker = setInterval(() => void syncNow(), SYNC_INTERVAL_MS)
  }

  function stopAutoSync() {
    clearInterval(syncTicker ?? undefined)
    syncTicker = null
    clearTimeout(debounceTimer ?? undefined)
    debounceTimer = null
  }

  function scheduleSync() {
    if (timeUp.value) return
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

  function startHeartbeat(
    targetSessionId: string,
    intervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
  ) {
    stopHeartbeat()
    heartbeatTicker = setInterval(() => void beat(targetSessionId), intervalMs)
  }

  function stopHeartbeat() {
    clearInterval(heartbeatTicker ?? undefined)
    heartbeatTicker = null
  }

  async function beat(targetSessionId: string) {
    if (submitted.value) return
    try {
      const result = await studentExamService.heartbeat(targetSessionId)
      if (result.requiresTokenReentry) {
        stopHeartbeat()
        options.onTokenReentry?.()
      }
      const next = Date.parse(result.deadline)
      if (!timeUp.value && Number.isFinite(next) && next !== deadline) {
        startClock(next, result.serverTime)
        options.onDeadlineChanged?.(next, result.serverTime)
      }
    } catch {
      return
    }
  }

  async function syncNow() {
    if (syncing || submitted.value || timeUp.value || !sessionId) return
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
      if (
        cause instanceof ExamApiError &&
        cause.code === API_ERROR_CODES.TIME_UP
      ) {
        expire()
        return
      }
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
      stopHeartbeat()
      return result
    } finally {
      submitting.value = false
    }
  }

  onUnmounted(() => {
    stopClock()
    stopAutoSync()
    stopHeartbeat()
  })

  return {
    questions,
    answers,
    loading,
    error,
    errorCode,
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
    startHeartbeat,
    stopHeartbeat,
    onConnectivityChanged,
    isAnswered,
  }
}
