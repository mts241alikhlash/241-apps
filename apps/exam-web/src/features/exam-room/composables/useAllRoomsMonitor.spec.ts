import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useAllRoomsMonitor } from './useAllRoomsMonitor'

const {
  loadOverview,
  loadMonitor,
  loadSupervisors,
  loadReport,
  loadFieldNotes,
} = vi.hoisted(() => ({
  loadOverview: vi.fn(),
  loadMonitor: vi.fn(),
  loadSupervisors: vi.fn(),
  loadReport: vi.fn(),
  loadFieldNotes: vi.fn(),
}))
vi.mock('../services/examRoomService', () => ({
  examRoomService: {
    loadOverview,
    loadMonitor,
    loadSupervisors,
    loadReport,
    loadFieldNotes,
  },
}))

const room = (id: string, code: string) => ({ id, code, name: `Ruang ${code}` })
const monitor = (counts: Partial<Record<string, number>> = {}) => ({
  data: [],
  meta: {
    summary: {
      totalRegistered: 30,
      notStartedCount: 10,
      inProgressCount: 15,
      finishedCount: 5,
      absentMarkedCount: 0,
      lockedOrViolationCount: 0,
      offlineOrUnsyncedCount: 0,
      ...counts,
    },
  },
})

describe('useAllRoomsMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    loadSupervisors.mockResolvedValue([
      {
        slotId: 'slot-a',
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: new Date(Date.now() + 60_000).toISOString(),
      },
    ])
    loadFieldNotes.mockResolvedValue({ success: true, data: [] })
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setVisibility(state: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => state,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  }

  it('loads every room, sorts them by code and totals the summaries', async () => {
    loadOverview.mockResolvedValue({
      success: true,
      data: [room('b', 'R10'), room('a', 'R2')],
    })
    loadMonitor.mockResolvedValue(monitor())
    const scope = effectScope()
    const monitorState = scope.run(() => useAllRoomsMonitor())!

    await monitorState.refresh()

    expect(monitorState.rooms.value.map((live) => live.room.code)).toEqual([
      'R2',
      'R10',
    ])
    expect(monitorState.totals.value).toMatchObject({
      registered: 60,
      notStarted: 20,
      inProgress: 30,
      finished: 10,
    })
    scope.stop()
  })

  it('keeps a room that failed to load instead of dropping the whole page', async () => {
    loadOverview.mockResolvedValue({ success: true, data: [room('a', 'R1')] })
    loadMonitor.mockRejectedValue(new Error('monitor-failed'))
    const scope = effectScope()
    const monitorState = scope.run(() => useAllRoomsMonitor())!

    await monitorState.refresh()

    expect(monitorState.rooms.value).toHaveLength(1)
    expect(monitorState.rooms.value[0].failed).toBe(true)
    scope.stop()
  })

  it('reports the overview error and keeps the previous rooms', async () => {
    loadOverview.mockResolvedValueOnce({
      success: true,
      data: [room('a', 'R1')],
    })
    loadMonitor.mockResolvedValue(monitor())
    const scope = effectScope()
    const monitorState = scope.run(() => useAllRoomsMonitor())!
    await monitorState.refresh()

    loadOverview.mockResolvedValueOnce({
      success: false,
      error: 'Gagal memuat daftar ruangan.',
    })
    await monitorState.refresh()

    expect(monitorState.error.value).toBe('Gagal memuat daftar ruangan.')
    expect(monitorState.rooms.value).toHaveLength(1)
    scope.stop()
  })

  it('fetches the field notes of every room in one call and never loads a report', async () => {
    loadOverview.mockResolvedValue({
      success: true,
      data: [room('a', 'R1'), room('b', 'R2')],
    })
    loadMonitor.mockResolvedValue(monitor())
    loadFieldNotes.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'n1',
          roomId: 'a',
          roomName: 'Ruang R1',
          slotId: 'slot-a',
          studentId: 's1',
          studentName: 'Siswa',
          sessionId: null,
          category: 'OTHER',
          note: 'Izin keluar',
          recordedAt: '2026-11-28T01:00:00.000Z',
        },
      ],
    })
    const scope = effectScope()
    const monitorState = scope.run(() => useAllRoomsMonitor())!

    await monitorState.refresh()

    expect(loadFieldNotes).toHaveBeenCalledTimes(1)
    expect(loadSupervisors).not.toHaveBeenCalled()
    expect(loadReport).not.toHaveBeenCalled()
    expect(monitorState.notes.value).toHaveLength(1)
    expect(monitorState.notes.value[0]).toMatchObject({
      roomId: 'a',
      roomName: 'Ruang R1',
      note: { note: 'Izin keluar' },
    })
    scope.stop()
  })

  it('polls every 30 s, pauses while hidden and refreshes once when visible', async () => {
    loadOverview.mockResolvedValue({ success: true, data: [room('a', 'R1')] })
    loadMonitor.mockResolvedValue(monitor())
    const scope = effectScope()
    const monitorState = scope.run(() => useAllRoomsMonitor())!
    monitorState.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(loadOverview).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(29_000)
    expect(loadOverview).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(loadOverview).toHaveBeenCalledTimes(2)

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(90_000)
    expect(loadOverview).toHaveBeenCalledTimes(2)

    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(0)
    expect(loadOverview).toHaveBeenCalledTimes(3)

    monitorState.stop()
    scope.stop()
  })

  it('skips a tick while a refresh is still in flight', async () => {
    let finish: (value: unknown) => void = () => undefined
    loadOverview.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const scope = effectScope()
    const monitorState = scope.run(() => useAllRoomsMonitor())!
    monitorState.start()
    await vi.advanceTimersByTimeAsync(0)

    await vi.advanceTimersByTimeAsync(60_000)
    expect(loadOverview).toHaveBeenCalledTimes(1)

    finish({ success: true, data: [] })
    monitorState.stop()
    scope.stop()
  })
})
