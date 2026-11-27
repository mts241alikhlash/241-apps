import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import type { OfflineRosterRow, OfflineSchedule } from '../types'

const { service } = vi.hoisted(() => ({
  service: {
    loadSchedules: vi.fn(),
    loadRoster: vi.fn(),
    save: vi.fn(),
  },
}))

vi.mock('../services/examOfflineService', () => ({
  examOfflineService: service,
}))

import { useOfflineScoreEntry } from './useOfflineScoreEntry'

const schedule: OfflineSchedule = {
  scheduleId: 's1',
  activityId: 'act',
  subjectName: 'Tafsir',
  classroomName: 'VII A',
  offlineKind: 'WRITTEN',
  maxScore: 50,
  startsAt: '2026-11-30T01:00:00.000Z',
  endsAt: '2026-11-30T02:30:00.000Z',
  registered: 4,
  scored: 1,
  absent: 1,
  missing: 2,
  published: 1,
}

const row = (overrides: Partial<OfflineRosterRow>): OfflineRosterRow => ({
  studentId: 'x',
  participantNumber: null,
  name: null,
  state: 'MISSING',
  rawScore: null,
  note: null,
  publication: null,
  ...overrides,
})

const roster = (): OfflineRosterRow[] => [
  row({
    studentId: 'a',
    participantNumber: '25-001',
    name: 'Ahmad',
    state: 'SCORED',
    rawScore: 40,
    note: 'rapi',
    publication: 'SENT',
  }),
  row({
    studentId: 'b',
    participantNumber: '25-002',
    name: 'Budi',
    state: 'ABSENT',
  }),
  row({ studentId: 'c', participantNumber: '25-003', name: 'Citra' }),
  row({ studentId: 'd', participantNumber: '25-004', name: 'Dewi' }),
]

async function setup() {
  const scope = effectScope()
  const entry = scope.run(() => useOfflineScoreEntry(ref('s1')))!
  await entry.load()
  return entry
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  service.loadSchedules.mockResolvedValue({ success: true, data: [schedule] })
  service.loadRoster.mockResolvedValue({ success: true, data: roster() })
  service.save.mockImplementation(
    (_id: string, studentId: string, body: { rawScore: number | null }) =>
      Promise.resolve({
        success: true,
        data: row({
          studentId,
          state: body.rawScore === null ? 'MISSING' : 'SCORED',
          rawScore: body.rawScore,
        }),
      }),
  )
})

afterEach(() => vi.useRealTimers())

describe('useOfflineScoreEntry', () => {
  it('loads the schedule and fills the drafts from the stored scores', async () => {
    const entry = await setup()
    expect(entry.schedule.value?.subjectName).toBe('Tafsir')
    expect(entry.drafts.a).toEqual({ score: '40', note: 'rapi' })
    expect(entry.drafts.c).toEqual({ score: '', note: '' })
    expect(entry.counts.value).toEqual({
      scored: 1,
      absent: 1,
      missing: 2,
      sent: 1,
    })
    expect(entry.missingRows.value.map((item) => item.name)).toEqual([
      'Citra',
      'Dewi',
    ])
  })

  it('reports a schedule that is not in the list', async () => {
    service.loadSchedules.mockResolvedValue({ success: true, data: [] })
    const entry = await setup()
    expect(entry.loadError.value).toBe('Jadwal tidak ditemukan.')
  })

  it('sends nothing for a row that did not change', async () => {
    const entry = await setup()
    entry.setScore('a', '40')
    entry.commit('a')
    await vi.runAllTimersAsync()
    expect(service.save).not.toHaveBeenCalled()
  })

  it('sends only the score of a changed row and shows saving then saved', async () => {
    const entry = await setup()
    entry.setScore('c', '45,5')
    entry.commit('c')
    expect(entry.pending.value).toBe(true)
    await vi.advanceTimersByTimeAsync(400)
    expect(service.save).toHaveBeenCalledTimes(1)
    expect(service.save).toHaveBeenCalledWith('s1', 'c', { rawScore: 45.5 })
    expect(entry.rowStates.c.status).toBe('saved')
    expect(entry.pending.value).toBe(false)
    expect(entry.rows.value.find((item) => item.studentId === 'c')?.state).toBe(
      'SCORED',
    )
  })

  it('waits for the typing to settle before it saves', async () => {
    const entry = await setup()
    entry.setScore('c', '4')
    entry.commit('c')
    entry.setScore('c', '45')
    entry.commit('c')
    await vi.runAllTimersAsync()
    expect(service.save).toHaveBeenCalledTimes(1)
    expect(service.save).toHaveBeenCalledWith('s1', 'c', { rawScore: 45 })
  })

  it('adds the note only when it changed', async () => {
    const entry = await setup()
    entry.setNote('a', 'perlu remedial')
    entry.commit('a')
    await vi.runAllTimersAsync()
    expect(service.save).toHaveBeenCalledWith('s1', 'a', {
      rawScore: 40,
      note: 'perlu remedial',
    })
  })

  it('flags an invalid value inline and does not send it', async () => {
    const entry = await setup()
    entry.setScore('c', '51')
    entry.commit('c')
    await vi.runAllTimersAsync()
    expect(service.save).not.toHaveBeenCalled()
    expect(entry.rowStates.c).toEqual({
      status: 'invalid',
      message: 'Nilai maksimal 50',
    })
    expect(entry.pending.value).toBe(false)
  })

  it('shows the server message and restores the stored value when a sent score is cleared', async () => {
    service.save.mockResolvedValueOnce({
      success: false,
      error: 'Nilai sudah terkirim; ganti dengan nilai baru',
      code: 'OFFLINE_SCORE_PUBLISHED',
    })
    const entry = await setup()
    entry.setScore('a', '')
    entry.commit('a')
    await vi.runAllTimersAsync()
    expect(service.save).toHaveBeenCalledWith('s1', 'a', { rawScore: null })
    expect(entry.rowStates.a).toEqual({
      status: 'error',
      message: 'Nilai sudah terkirim; ganti dengan nilai baru',
    })
    expect(entry.drafts.a.score).toBe('40')
    expect(entry.lastError.value).toContain(
      'Nilai sudah terkirim; ganti dengan nilai baru',
    )
  })

  it('keeps the typed value when a save fails for another reason', async () => {
    service.save.mockResolvedValueOnce({
      success: false,
      error: 'Gagal menyimpan nilai.',
    })
    const entry = await setup()
    entry.setScore('c', '30')
    entry.commit('c')
    await vi.runAllTimersAsync()
    expect(entry.rowStates.c.status).toBe('error')
    expect(entry.drafts.c.score).toBe('30')
  })

  it('never saves an absent student', async () => {
    const entry = await setup()
    entry.setScore('b', '30')
    entry.commit('b')
    await vi.runAllTimersAsync()
    expect(service.save).not.toHaveBeenCalled()
  })

  it('fills consecutive rows from a pasted column, skipping absent students and text', async () => {
    const entry = await setup()
    const summary = entry.paste('a', '41\n42\nSkor\n43,5\n')
    await vi.runAllTimersAsync()

    expect(entry.drafts.a.score).toBe('41')
    expect(entry.drafts.b.score).toBe('')
    expect(entry.drafts.c.score).toBe('42')
    expect(entry.drafts.d.score).toBe('43,5')
    expect(service.save.mock.calls).toEqual([
      ['s1', 'a', { rawScore: 41 }],
      ['s1', 'c', { rawScore: 42 }],
      ['s1', 'd', { rawScore: 43.5 }],
    ])
    expect(summary).toBe('3 nilai ditempel, 1 baris bukan angka dilewati.')
  })

  it('leaves a row unchanged for a blank pasted line and flags an out-of-range one', async () => {
    const entry = await setup()
    const summary = entry.paste('a', '\n99\n20')
    await vi.runAllTimersAsync()

    expect(entry.drafts.a.score).toBe('40')
    expect(entry.drafts.c.score).toBe('99')
    expect(entry.rowStates.c.status).toBe('invalid')
    expect(entry.drafts.d.score).toBe('20')
    expect(service.save.mock.calls).toEqual([['s1', 'd', { rawScore: 20 }]])
    expect(summary).toBe('2 nilai ditempel.')
  })

  it('counts pasted values that do not fit below the last student', async () => {
    const entry = await setup()
    const summary = entry.paste('d', '10\n11\n12')
    await vi.runAllTimersAsync()
    expect(entry.drafts.d.score).toBe('10')
    expect(summary).toBe(
      '1 nilai ditempel, 2 nilai melebihi jumlah siswa tidak dipakai.',
    )
  })
})
