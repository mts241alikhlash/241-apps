import type {
  AnswerPayload,
  AnswerSyncState,
  AnswerSyncSummary,
  SaveAnswerItem,
  SaveAnswersBatchResult,
  SubmitRequest,
} from '../types'

export const MAX_BATCH_SIZE = 100
export const MAX_SUBMIT_PENDING = 250
export const SYNC_INTERVAL_MS = 10_000
export const SYNC_DEBOUNCE_MS = 1_500

export interface AnswerRow {
  questionId: string
  clientId: string
  answer: AnswerPayload
  updatedAtMillis: number
  syncState: AnswerSyncState
  confirmedAtMillis: number | null
}

export type AnswerRows = Map<string, AnswerRow>

export interface SyncApi {
  saveAnswersBatch(
    sessionId: string,
    answers: SaveAnswerItem[],
    pendingLocalCount?: number,
  ): Promise<SaveAnswersBatchResult>
}

export function toItem(row: AnswerRow): SaveAnswerItem {
  return {
    questionId: row.questionId,
    clientId: row.clientId,
    answer: row.answer,
  }
}

export function isAnsweredPayload(answer: AnswerPayload): boolean {
  if ('key' in answer) return answer.key.length > 0
  if ('keys' in answer) return answer.keys.length > 0
  if ('value' in answer) return typeof answer.value === 'boolean'
  return answer.text.trim().length > 0
}

export function recordAnswer(
  rows: AnswerRows,
  questionId: string,
  answer: AnswerPayload,
  now: number,
  newClientId: () => string,
): AnswerRow {
  const previous = rows.get(questionId)
  const unchanged =
    previous !== undefined &&
    previous.syncState !== 'SERVER_CONFIRMED' &&
    JSON.stringify(previous.answer) === JSON.stringify(answer)
  if (unchanged) return previous

  const row: AnswerRow = {
    questionId,
    clientId: newClientId(),
    answer,
    updatedAtMillis: now,
    syncState: isAnsweredPayload(answer) ? 'LOCAL_PENDING' : 'SERVER_CONFIRMED',
    confirmedAtMillis: isAnsweredPayload(answer) ? null : now,
  }
  rows.set(questionId, row)
  return row
}

export function pendingRows(rows: AnswerRows): AnswerRow[] {
  return [...rows.values()]
    .filter(
      (row) =>
        row.syncState !== 'SERVER_CONFIRMED' && isAnsweredPayload(row.answer),
    )
    .sort((a, b) => a.updatedAtMillis - b.updatedAtMillis)
}

export function answeredCount(rows: AnswerRows): number {
  return [...rows.values()].filter((row) => isAnsweredPayload(row.answer))
    .length
}

export function syncSummary(rows: AnswerRows): AnswerSyncSummary {
  const all = [...rows.values()].filter((row) => isAnsweredPayload(row.answer))
  const confirmedCount = all.filter(
    (row) => row.syncState === 'SERVER_CONFIRMED',
  ).length
  return {
    totalAnswered: all.length,
    confirmedCount,
    pendingCount: all.length - confirmedCount,
  }
}

export function markSyncing(rows: AnswerRows, sent: AnswerRow[]): void {
  for (const item of sent) {
    const current = rows.get(item.questionId)
    if (current?.clientId !== item.clientId) continue
    rows.set(item.questionId, { ...current, syncState: 'SYNCING' })
  }
}

export function releaseSyncing(rows: AnswerRows, sent: AnswerRow[]): void {
  for (const item of sent) {
    const current = rows.get(item.questionId)
    if (current?.clientId !== item.clientId) continue
    if (current.syncState !== 'SYNCING') continue
    rows.set(item.questionId, { ...current, syncState: 'LOCAL_PENDING' })
  }
}

export function applyBatchResult(
  rows: AnswerRows,
  sent: AnswerRow[],
  result: SaveAnswersBatchResult,
  now: number,
  newClientId: () => string,
): { confirmed: number; skipped: number } {
  let confirmed = 0
  for (const item of sent) {
    const acknowledged = result.confirmed.some(
      (ack) =>
        ack.questionId === item.questionId && ack.clientId === item.clientId,
    )
    const current = rows.get(item.questionId)
    if (current?.clientId !== item.clientId) continue
    if (
      !acknowledged ||
      current.updatedAtMillis !== item.updatedAtMillis ||
      current.syncState === 'SERVER_CONFIRMED'
    ) {
      if (current.syncState === 'SYNCING') {
        rows.set(item.questionId, { ...current, syncState: 'LOCAL_PENDING' })
      }
      continue
    }
    rows.set(item.questionId, {
      ...current,
      syncState: 'SERVER_CONFIRMED',
      confirmedAtMillis: now,
    })
    confirmed += 1
  }

  let skipped = 0
  for (const refused of result.skipped) {
    const current = rows.get(refused.questionId)
    if (current?.clientId !== refused.clientId) continue
    rows.set(refused.questionId, {
      ...current,
      clientId: newClientId(),
      syncState: 'LOCAL_PENDING',
    })
    skipped += 1
  }

  return { confirmed, skipped }
}

export async function syncPendingAnswers(
  rows: AnswerRows,
  sessionId: string,
  api: SyncApi,
  now: () => number,
  newClientId: () => string,
): Promise<{ confirmed: number; pending: number; skipped: number }> {
  let confirmed = 0
  let skipped = 0
  let rebinds = 0

  while (true) {
    const pending = pendingRows(rows)
    if (pending.length === 0) break
    const chunk = pending.slice(0, MAX_BATCH_SIZE)
    markSyncing(rows, chunk)
    let result: SaveAnswersBatchResult
    try {
      result = await api.saveAnswersBatch(
        sessionId,
        chunk.map(toItem),
        Math.max(0, pending.length - chunk.length),
      )
    } catch (cause) {
      releaseSyncing(rows, chunk)
      throw cause
    }
    const applied = applyBatchResult(rows, chunk, result, now(), newClientId)
    confirmed += applied.confirmed
    skipped += applied.skipped
    rebinds += applied.skipped
    if (rebinds > 0 && rebinds <= MAX_BATCH_SIZE) continue
    if (applied.confirmed === 0) break
    if (chunk.length < MAX_BATCH_SIZE) break
  }

  return { confirmed, pending: pendingRows(rows).length, skipped }
}

export function submitPayload(rows: AnswerRows, violations = 0): SubmitRequest {
  const pending = pendingRows(rows).slice(0, MAX_SUBMIT_PENDING)
  return {
    violations,
    expectedAnswerCount: answeredCount(rows),
    pendingAnswers: pending.length > 0 ? pending.map(toItem) : undefined,
  }
}

export const UNSENT_MESSAGE = 'Jawaban belum terkirim. Coba lagi.'

export async function prepareSubmit(
  rows: AnswerRows,
  sessionId: string,
  api: SyncApi,
  now: () => number,
  newClientId: () => string,
  violations = 0,
): Promise<SubmitRequest> {
  if (pendingRows(rows).length > MAX_SUBMIT_PENDING) {
    await syncPendingAnswers(rows, sessionId, api, now, newClientId)
    if (pendingRows(rows).length > MAX_SUBMIT_PENDING) {
      throw new Error(UNSENT_MESSAGE)
    }
  }
  return submitPayload(rows, violations)
}

export function syncLabel(summary: AnswerSyncSummary): string {
  if (summary.pendingCount === 0) {
    return `Tersimpan: ${summary.totalAnswered} soal (Terkirim ke server: ${summary.confirmedCount})`
  }
  return `Tersimpan di HP: ${summary.totalAnswered} soal (Menunggu koneksi: ${summary.pendingCount})`
}

export const STORAGE_PREFIX = 'cbt:answers:'

interface StoredRow {
  questionId: string
  clientId: string
  answer: AnswerPayload
  updatedAtMillis: number
  syncState: AnswerSyncState
  confirmedAtMillis: number | null
}

export function saveRows(
  storage: Storage,
  sessionId: string,
  rows: AnswerRows,
): void {
  try {
    const payload = JSON.stringify([...rows.values()] satisfies StoredRow[])
    storage.setItem(`${STORAGE_PREFIX}${sessionId}`, payload)
  } catch {
    return
  }
}

export function loadRows(storage: Storage, sessionId: string): AnswerRows {
  try {
    const raw = storage.getItem(`${STORAGE_PREFIX}${sessionId}`)
    if (!raw) return new Map()
    const parsed = JSON.parse(raw) as StoredRow[]
    if (!Array.isArray(parsed)) return new Map()
    return new Map(
      parsed
        .filter((row) => row && typeof row.questionId === 'string')
        .map((row) => [row.questionId, { ...row }]),
    )
  } catch {
    return new Map()
  }
}

export function clearRows(storage: Storage, sessionId: string): void {
  try {
    storage.removeItem(`${STORAGE_PREFIX}${sessionId}`)
  } catch {
    return
  }
}
