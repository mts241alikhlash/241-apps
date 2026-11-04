import { describe, expect, it, vi } from 'vitest'
import {
  MAX_BATCH_SIZE,
  MAX_SUBMIT_PENDING,
  clearRows,
  loadRows,
  pendingRows,
  prepareSubmit,
  recordAnswer,
  saveRows,
  syncLabel,
  syncPendingAnswers,
  submitPayload,
  syncSummary,
  type AnswerRows,
  type SyncApi,
} from './answerSync'
import type {
  SaveAnswerItem,
  SaveAnswersBatchResult,
  SkippedAnswer,
} from '../types'

const payload = (key: string) => ({ key })

function rowsWith(count: number): AnswerRows {
  const rows: AnswerRows = new Map()
  for (let index = 1; index <= count; index += 1) {
    recordAnswer(rows, `q${index}`, payload('A'), index, () => `c${index}`)
  }
  return rows
}

function ack(
  items: SaveAnswerItem[],
  skipped: SkippedAnswer[] = [],
): SaveAnswersBatchResult {
  return {
    confirmed: items
      .filter(
        (item) =>
          !skipped.some(
            (row) =>
              row.questionId === item.questionId &&
              row.clientId === item.clientId,
          ),
      )
      .map((item) => ({
        questionId: item.questionId,
        clientId: item.clientId,
        updatedAt: '2026-10-27T00:00:00.000Z',
        receivedAfterDeadline: false,
      })),
    skipped,
    confirmedCount: items.length,
    serverTime: '2026-10-27T00:00:00.000Z',
  }
}

function fakeApi(
  onCall?: (items: SaveAnswerItem[]) => SaveAnswersBatchResult,
): SyncApi & { calls: SaveAnswerItem[][] } {
  const calls: SaveAnswerItem[][] = []
  return {
    calls,
    saveAnswersBatch(_sessionId, items) {
      calls.push(items)
      return Promise.resolve(onCall ? onCall(items) : ack(items))
    },
  }
}

describe('answer sync', () => {
  it('syncs 46 pending answers in a single batch call', async () => {
    const rows = rowsWith(46)
    const api = fakeApi()

    const outcome = await syncPendingAnswers(
      rows,
      's1',
      api,
      () => 9_000,
      () => 'fresh',
    )

    expect(api.calls).toHaveLength(1)
    expect(api.calls[0]).toHaveLength(46)
    expect(outcome.confirmed).toBe(46)
    expect(outcome.pending).toBe(0)
    expect(
      [...rows.values()].every((row) => row.syncState === 'SERVER_CONFIRMED'),
    ).toBe(true)
  })

  it('chunks more than the batch limit', async () => {
    const rows = rowsWith(150)
    const api = fakeApi()

    const outcome = await syncPendingAnswers(
      rows,
      's1',
      api,
      () => 9_000,
      () => 'fresh',
    )

    expect(api.calls.map((items) => items.length)).toEqual([MAX_BATCH_SIZE, 50])
    expect(outcome.confirmed).toBe(150)
    expect(outcome.pending).toBe(0)
  })

  it('keeps an answer edited during the batch pending', async () => {
    const rows = rowsWith(1)
    const api = fakeApi(() => {
      recordAnswer(rows, 'q1', payload('B'), 5_000, () => 'c-q1-v2')
      return ack([{ questionId: 'q1', clientId: 'c1', answer: payload('A') }])
    })

    const outcome = await syncPendingAnswers(
      rows,
      's1',
      api,
      () => 9_000,
      () => 'fresh',
    )

    const row = rows.get('q1')!
    expect(row.syncState).toBe('LOCAL_PENDING')
    expect(row.answer).toEqual(payload('B'))
    expect(outcome.confirmed).toBe(0)
    expect(outcome.pending).toBe(1)
  })

  it('drops a skipped answer and re-sends it with a fresh client id', async () => {
    const rows = rowsWith(1)
    const refused = { questionId: 'q1', clientId: 'c1' }
    let refuse = true
    const api = fakeApi((items) => {
      if (!refuse) return ack(items)
      refuse = false
      return ack(items, [refused])
    })

    const outcome = await syncPendingAnswers(
      rows,
      's1',
      api,
      () => 9_000,
      () => 'fresh-client',
    )

    expect(outcome.skipped).toBe(1)
    expect(api.calls).toHaveLength(2)
    expect(api.calls[0][0].clientId).toBe('c1')
    expect(api.calls[1][0].clientId).not.toBe('c1')
    expect(api.calls[1][0].clientId).toBe('fresh-client')
    expect(rows.get('q1')?.syncState).toBe('SERVER_CONFIRMED')
  })

  it('reports the honest summary while answers are queued', () => {
    const rows = rowsWith(3)
    rows.set('q1', {
      ...rows.get('q1')!,
      syncState: 'SERVER_CONFIRMED',
    })

    const summary = syncSummary(rows)

    expect(summary).toEqual({
      totalAnswered: 3,
      confirmedCount: 1,
      pendingCount: 2,
    })
    expect(syncLabel(summary)).toBe(
      'Tersimpan di HP: 3 soal (Menunggu koneksi: 2)',
    )
  })

  it('reports a fully confirmed summary', () => {
    const rows = rowsWith(2)
    for (const row of rows.values()) row.syncState = 'SERVER_CONFIRMED'

    expect(syncLabel(syncSummary(rows))).toBe(
      'Tersimpan: 2 soal (Terkirim ke server: 2)',
    )
  })

  it('marks a row SYNCING while the batch is in flight and pending after a failure', async () => {
    const rows = rowsWith(1)
    const observed: string[] = []
    const api: SyncApi = {
      saveAnswersBatch() {
        observed.push(rows.get('q1')!.syncState)
        return Promise.reject(new Error('offline'))
      },
    }

    await expect(
      syncPendingAnswers(
        rows,
        's1',
        api,
        () => 9_000,
        () => 'fresh',
      ),
    ).rejects.toThrow('offline')

    expect(observed).toEqual(['SYNCING'])
    expect(rows.get('q1')!.syncState).toBe('LOCAL_PENDING')
  })

  it('never sends a blank answer as pending', () => {
    const rows = rowsWith(1)
    recordAnswer(rows, 'q2', { text: '   ' }, 2_000, () => 'c2')

    expect(pendingRows(rows).map((row) => row.questionId)).toEqual(['q1'])
    expect(submitPayload(rows).pendingAnswers).toHaveLength(1)
  })

  it('caps the submit payload at the server limit', () => {
    const rows = rowsWith(MAX_SUBMIT_PENDING + 20)

    expect(submitPayload(rows).pendingAnswers).toHaveLength(MAX_SUBMIT_PENDING)
    expect(submitPayload(rows).expectedAnswerCount).toBe(
      MAX_SUBMIT_PENDING + 20,
    )
  })

  it('syncs in chunks before submitting when the queue exceeds the cap', async () => {
    const rows = rowsWith(MAX_SUBMIT_PENDING + 20)
    const api = fakeApi()

    const request = await prepareSubmit(
      rows,
      's1',
      api,
      () => 9_000,
      () => 'fresh',
    )

    expect(api.calls.flat()).toHaveLength(MAX_SUBMIT_PENDING + 20)
    expect(pendingRows(rows)).toHaveLength(0)
    expect(request.pendingAnswers ?? []).toHaveLength(0)
    expect(request.expectedAnswerCount).toBe(MAX_SUBMIT_PENDING + 20)
    expect(request.expectedAnswerCount).toBe(
      (request.pendingAnswers?.length ?? 0) + MAX_SUBMIT_PENDING + 20,
    )
  })

  it('refuses to submit a shortfall when the pre-sync could not drain the queue', async () => {
    const rows = rowsWith(MAX_SUBMIT_PENDING + 20)
    const api = fakeApi(() => {
      throw new Error('offline')
    })

    await expect(
      prepareSubmit(
        rows,
        's1',
        api,
        () => 9_000,
        () => 'fresh',
      ),
    ).rejects.toThrow('offline')
    expect(pendingRows(rows)).toHaveLength(MAX_SUBMIT_PENDING + 20)
  })

  it('keeps answering when storage refuses every write', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('SecurityError')
      },
      removeItem: () => {
        throw new Error('SecurityError')
      },
      clear: () => undefined,
      key: () => null,
      length: 0,
    } as Storage
    const rows: AnswerRows = new Map()

    const row = recordAnswer(rows, 'q1', payload('A'), 1_000, () => 'c1')
    expect(() => saveRows(broken, 's1', rows)).not.toThrow()
    expect(() => clearRows(broken, 's1')).not.toThrow()
    expect(loadRows(broken, 's1').size).toBe(0)
    expect(row.syncState).toBe('LOCAL_PENDING')
    expect(pendingRows(rows)).toHaveLength(1)
  })

  it('falls back to no rows when the stored value is not a row list', () => {
    const storage = {
      getItem: () => '{not json',
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    } as Storage
    const foreign = {
      getItem: () => '{"questionId":"q1"}',
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    } as Storage

    expect(loadRows(storage, 's1').size).toBe(0)
    expect(loadRows(foreign, 's1').size).toBe(0)
  })

  it('restores local pending answers after a reload', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage

    const rows: AnswerRows = new Map()
    recordAnswer(rows, 'q1', payload('A'), 1_000, () => 'c1')
    saveRows(storage, 's1', rows)

    const reloaded = loadRows(storage, 's1')
    expect(reloaded.get('q1')?.syncState).toBe('LOCAL_PENDING')
    expect(pendingRows(reloaded)).toHaveLength(1)

    clearRows(storage, 's1')
    expect(loadRows(storage, 's1').size).toBe(0)
  })

  it('mints a new client id when a confirmed answer changes', () => {
    const rows: AnswerRows = new Map()
    const newClientId = vi.fn(() => 'first')
    recordAnswer(rows, 'q1', payload('A'), 1_000, newClientId)
    rows.set('q1', {
      ...rows.get('q1')!,
      syncState: 'SERVER_CONFIRMED',
    })
    newClientId.mockReturnValue('second')

    const row = recordAnswer(rows, 'q1', payload('B'), 2_000, newClientId)

    expect(row.clientId).toBe('second')
    expect(row.syncState).toBe('LOCAL_PENDING')
    expect(row.confirmedAtMillis).toBeNull()
    expect(pendingRows(rows)).toHaveLength(1)
  })
})

describe('submit payload', () => {
  it('sends the remaining pending answers with the expected count', () => {
    const rows = rowsWith(46)

    const request = submitPayload(rows, 2)

    expect(request.expectedAnswerCount).toBe(46)
    expect(request.pendingAnswers).toHaveLength(46)
    expect(request.violations).toBe(2)
  })

  it('omits pendingAnswers when everything is confirmed', () => {
    const rows = rowsWith(2)
    for (const row of rows.values()) row.syncState = 'SERVER_CONFIRMED'

    const request = submitPayload(rows)

    expect(request.pendingAnswers).toBeUndefined()
    expect(request.expectedAnswerCount).toBe(2)
  })
})
