import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useAllRoomsMonitor } from './useAllRoomsMonitor'

const { loadOverview, loadMonitor, loadSupervisors, loadReport } = vi.hoisted(
  () => ({
    loadOverview: vi.fn(),
    loadMonitor: vi.fn(),
    loadSupervisors: vi.fn(),
    loadReport: vi.fn(),
  }),
)
vi.mock('../services/examRoomService', () => ({
  examRoomService: { loadOverview, loadMonitor, loadSupervisors, loadReport },
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
    loadSupervisors.mockResolvedValue([])
  })

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
})
