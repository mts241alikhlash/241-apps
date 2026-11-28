import { computed, nextTick, reactive, ref, type Ref } from 'vue'
import { examOfflineService } from '../services/examOfflineService'
import {
  SCORE_PUBLISHED_CODE,
  type OfflineRosterRow,
  type OfflineSchedule,
  type SaveOfflineScorePayload,
} from '../types'
import { parseScore, pastedColumn } from '../utils/score'

export type RowStatus = 'idle' | 'saving' | 'saved' | 'invalid' | 'error'

export interface RowState {
  status: RowStatus
  message: string | null
}

export interface RowDraft {
  score: string
  note: string
}

const SAVE_DELAY_MS = 300

const NUMBER_LINE = /^-?\d+([.,]\d+)?$/

const HEADER_LINE = /^(score|nilai|skor)$/i

const NAMED_LIMIT = 5

const NOTE_UNSAVED = 'Catatan belum tersimpan.'

function namesOf(list: OfflineRosterRow[]): string {
  const names = list.map((item) => item.name ?? item.participantNumber ?? '-')
  const shown = names.slice(0, NAMED_LIMIT).join(', ')
  return names.length > NAMED_LIMIT
    ? `${shown} dan ${names.length - NAMED_LIMIT} lainnya`
    : shown
}

const scoreText = (value: number | null) =>
  value === null ? '' : String(value).replace('.', ',')

export function useOfflineScoreEntry(scheduleId: Ref<string>) {
  const schedule = ref<OfflineSchedule | null>(null)
  const rows = ref<OfflineRosterRow[]>([])
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const lastError = ref('')
  const drafts = reactive<Record<string, RowDraft>>({})
  const rowStates = reactive<Record<string, RowState>>({})
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const inFlight = new Set<string>()
  const again = new Set<string>()
  const queued = ref(0)

  const maxScore = computed(() => schedule.value?.maxScore ?? 0)
  const rowOf = (studentId: string) =>
    rows.value.find((item) => item.studentId === studentId)

  function setState(
    studentId: string,
    status: RowStatus,
    message: string | null = null,
  ) {
    rowStates[studentId] = { status, message }
  }

  function adopt(row: OfflineRosterRow) {
    drafts[row.studentId] = {
      score: scoreText(row.rawScore),
      note: row.note ?? '',
    }
  }

  function applyRoster(list: OfflineRosterRow[]) {
    rows.value = list
    for (const row of list) {
      adopt(row)
      setState(row.studentId, 'idle')
    }
  }

  async function reloadRoster(): Promise<boolean> {
    const roster = await examOfflineService.loadRoster(scheduleId.value)
    if (!roster.success) {
      loadError.value = roster.error
      return false
    }
    applyRoster(roster.data)
    return true
  }

  async function load() {
    loading.value = true
    loadError.value = null
    try {
      const [schedules, roster] = await Promise.all([
        examOfflineService.loadSchedules(),
        examOfflineService.loadRoster(scheduleId.value),
      ])
      if (!schedules.success) {
        loadError.value = schedules.error
        return
      }
      schedule.value =
        schedules.data.find((item) => item.scheduleId === scheduleId.value) ??
        null
      if (schedule.value === null) {
        loadError.value = 'Jadwal tidak ditemukan.'
        return
      }
      if (!roster.success) {
        loadError.value = roster.error
        return
      }
      applyRoster(roster.data)
    } finally {
      loading.value = false
    }
  }

  function edited(studentId: string) {
    if (rowStates[studentId]?.status === 'saved') setState(studentId, 'idle')
  }

  function setScore(studentId: string, text: string) {
    const draft = drafts[studentId]
    if (!draft) return
    draft.score = text
    edited(studentId)
  }

  function setNote(studentId: string, text: string) {
    const draft = drafts[studentId]
    if (!draft) return
    draft.note = text
    edited(studentId)
  }

  async function announce(message: string) {
    lastError.value = ''
    await nextTick()
    lastError.value = message
  }

  function payloadOf(
    studentId: string,
  ): SaveOfflineScorePayload | null | string {
    const row = rowOf(studentId)
    const draft = drafts[studentId]
    if (!row || !draft || row.state === 'ABSENT') return null
    const parsed = parseScore(draft.score, maxScore.value)
    if (!parsed.ok) return parsed.error
    const noteChanged = draft.note !== (row.note ?? '')
    if (parsed.value === row.rawScore && !noteChanged) return null
    return noteChanged
      ? { rawScore: parsed.value, note: draft.note }
      : { rawScore: parsed.value }
  }

  function validate(studentId: string): boolean {
    const payload = payloadOf(studentId)
    if (typeof payload === 'string') {
      setState(studentId, 'invalid', payload)
      return false
    }
    if (rowStates[studentId]?.status === 'invalid') setState(studentId, 'idle')
    return payload !== null
  }

  async function save(studentId: string) {
    if (inFlight.has(studentId)) {
      again.add(studentId)
      return
    }
    const payload = payloadOf(studentId)
    if (payload === null || typeof payload === 'string') {
      validate(studentId)
      return
    }
    inFlight.add(studentId)
    setState(studentId, 'saving')
    const sent = { ...drafts[studentId] }
    const result = await examOfflineService.save(
      scheduleId.value,
      studentId,
      payload,
    )
    inFlight.delete(studentId)
    if (result.success) {
      again.delete(studentId)
      rows.value = rows.value.map((item) =>
        item.studentId === studentId ? result.data : item,
      )
      const draft = drafts[studentId]
      if (draft.score === sent.score && draft.note === sent.note) {
        adopt(result.data)
        setState(studentId, 'saved')
      } else {
        setState(studentId, 'idle')
        commit(studentId)
      }
      return
    }
    const row = rowOf(studentId)
    let message = result.error
    if (result.code === SCORE_PUBLISHED_CODE && row) {
      drafts[studentId].score = scoreText(row.rawScore)
      if (drafts[studentId].note !== (row.note ?? '')) {
        message = `${result.error}. ${NOTE_UNSAVED}`
      }
    }
    setState(studentId, 'error', message)
    await announce(`${row?.name ?? 'Siswa'}: ${result.error}`)
    if (again.delete(studentId)) await save(studentId)
  }

  function commit(studentId: string) {
    const existing = timers.get(studentId)
    if (existing !== undefined) {
      clearTimeout(existing)
      queued.value -= 1
    }
    if (!validate(studentId)) {
      timers.delete(studentId)
      return
    }
    queued.value += 1
    timers.set(
      studentId,
      setTimeout(() => {
        timers.delete(studentId)
        queued.value -= 1
        void save(studentId)
      }, SAVE_DELAY_MS),
    )
  }

  function paste(studentId: string, text: string): string {
    const column = pastedColumn(text)
    if (!column.ok) return column.error
    const lines = [...column.lines]
    while (lines.length > 0 && HEADER_LINE.test(lines[0])) lines.shift()
    const start = Math.max(
      rows.value.findIndex((item) => item.studentId === studentId),
      0,
    )
    let applied = 0
    let overflow = 0
    let textLines = 0
    const invalid: OfflineRosterRow[] = []
    const withoutNumber: OfflineRosterRow[] = []
    const onAbsent: OfflineRosterRow[] = []
    lines.forEach((line, index) => {
      const target = rows.value[start + index]
      const numeric = NUMBER_LINE.test(line)
      if (target === undefined) {
        if (numeric) overflow += 1
      } else if (target.state === 'ABSENT') {
        if (numeric) onAbsent.push(target)
      } else if (!numeric) {
        if (line !== '') textLines += 1
        withoutNumber.push(target)
      } else {
        setScore(target.studentId, line)
        if (parseScore(line, maxScore.value).ok) applied += 1
        else invalid.push(target)
        commit(target.studentId)
      }
    })
    const parts = [`${applied} nilai ditempel.`]
    if (invalid.length > 0) {
      parts.push(
        `${invalid.length} nilai tidak valid pada: ${namesOf(invalid)}.`,
      )
    }
    if (textLines > 0) {
      parts.push(
        `${withoutNumber.length} baris tanpa angka dilewati: ${namesOf(withoutNumber)}.`,
      )
    } else if (withoutNumber.length > 0) {
      parts.push(`${withoutNumber.length} baris kosong dilewati.`)
    }
    if (onAbsent.length > 0) {
      parts.push(
        `${onAbsent.length} nilai jatuh pada siswa tidak hadir dan dilewati: ${namesOf(onAbsent)}.`,
      )
    }
    if (overflow > 0) {
      parts.push(`${overflow} nilai melebihi jumlah siswa tidak dipakai.`)
    }
    return parts.join(' ')
  }

  const pending = computed(
    () =>
      queued.value > 0 ||
      Object.values(rowStates).some((state) => state.status === 'saving'),
  )

  const counts = computed(() => ({
    scored: rows.value.filter((item) => item.state === 'SCORED').length,
    absent: rows.value.filter((item) => item.state === 'ABSENT').length,
    missing: rows.value.filter((item) => item.state === 'MISSING').length,
    sent: rows.value.filter(
      (item) => item.state === 'SCORED' && item.publication === 'SENT',
    ).length,
  }))

  const missingRows = computed(() =>
    rows.value.filter((item) => item.state === 'MISSING'),
  )

  const blockingRows = computed(() =>
    rows.value.filter((item) => {
      const status = rowStates[item.studentId]?.status
      return (
        status === 'invalid' ||
        (status === 'error' && payloadOf(item.studentId) !== null)
      )
    }),
  )

  const absentSentRows = computed(() =>
    rows.value.filter(
      (item) => item.state === 'ABSENT' && item.publication === 'SENT',
    ),
  )

  return {
    schedule,
    rows,
    loading,
    loadError,
    lastError,
    drafts,
    rowStates,
    pending,
    counts,
    missingRows,
    absentSentRows,
    blockingRows,
    load,
    reloadRoster,
    setScore,
    setNote,
    commit,
    paste,
  }
}
