import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { useRoomMonitor } from './useRoomMonitor'
import type { RoomMonitorMeta } from '../types'

const { loadMonitor } = vi.hoisted(() => ({ loadMonitor: vi.fn() }))
vi.mock('../services/examRoomService', () => ({
  examRoomService: { loadMonitor },
}))

const meta = (overrides: Partial<RoomMonitorMeta> = {}): RoomMonitorMeta => ({
  page: 1,
  limit: 25,
  total: 34,
  serverTime: '2026-11-02T01:10:00.000Z',
  room: {
    id: 'r1',
    code: 'R01',
    name: 'Ruang 01',
    capacity: 30,
    technicianName: 'Teknisi',
    currentSupervisorName: 'Pengawas',
    scheduledSupervisorName: 'Pengawas',
    isSubstituted: false,
  },
  token: null,
  summary: {
    totalRegistered: 34,
    notStartedCount: 2,
    inProgressCount: 30,
    offlineOrUnsyncedCount: 4,
    lockedOrViolationCount: 0,
    finishedCount: 2,
    absentMarkedCount: 0,
  },
  ...overrides,
})

const row = { seatNumber: 1, studentId: 'st1', session: null }

const page = (data = [row], extra: Partial<RoomMonitorMeta> = {}) => ({
  data,
  meta: meta(extra),
})

describe('useRoomMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    loadMonitor.mockResolvedValue(page())
  })

  it('loads the first page and records the server time', async () => {
    const monitor = useRoomMonitor({ roomId: ref('r1') })
    await flushPromises()
    await monitor.refresh()

    expect(loadMonitor).toHaveBeenCalledWith('r1', {
      page: 1,
      limit: 25,
      search: undefined,
      status: undefined,
      classroomId: undefined,
      slotId: undefined,
    })
    expect(monitor.participants.value).toEqual([row])
    expect(monitor.lastUpdatedServerTime.value).toBe('2026-11-02T01:10:00.000Z')
    expect(monitor.secondsSinceLastSuccess.value).toBe(0)
    expect(monitor.summary.value?.totalRegistered).toBe(34)
    monitor.stop()
  })

  it('goes back to page one on a search or filter change', async () => {
    const monitor = useRoomMonitor({ roomId: ref('r1') })
    monitor.page.value = 3
    monitor.search.value = 'Ahmad'
    await nextTick()

    expect(monitor.page.value).toBe(1)

    monitor.page.value = 2
    monitor.status.value = 'LOCKED'
    await nextTick()

    expect(monitor.page.value).toBe(1)
    monitor.stop()
  })

  it('keeps the table data when a poll fails', async () => {
    const monitor = useRoomMonitor({ roomId: ref('r1') })
    await flushPromises()
    await monitor.refresh()

    loadMonitor.mockRejectedValueOnce(new Error('offline'))
    await monitor.refresh()

    expect(monitor.participants.value).toEqual([row])
    expect(monitor.failed.value).toBe(true)
    expect(monitor.error.value).toContain('Koneksi terputus')
    expect(monitor.lastUpdatedServerTime.value).toBe('2026-11-02T01:10:00.000Z')
    monitor.stop()
  })

  it('turns the badge to danger on the first failure before any success', async () => {
    loadMonitor.mockRejectedValue(new Error('offline'))
    const monitor = useRoomMonitor({ roomId: ref('r1') })
    await flushPromises()

    expect(monitor.failed.value).toBe(true)
    expect(monitor.staleness.value).toBe('danger')
    monitor.stop()
  })

  it('turns the staleness badge to warning at 15 seconds', async () => {
    vi.useFakeTimers()
    const monitor = useRoomMonitor({ roomId: ref('r1') })
    await monitor.refresh()
    await flushPromises()

    expect(monitor.staleness.value).toBe('fresh')

    vi.advanceTimersByTime(14_000)
    expect(monitor.secondsSinceLastSuccess.value).toBe(14)
    expect(monitor.staleness.value).toBe('fresh')

    vi.advanceTimersByTime(1_000)
    expect(monitor.secondsSinceLastSuccess.value).toBe(15)
    expect(monitor.staleness.value).toBe('warning')

    vi.advanceTimersByTime(30_000)
    expect(monitor.staleness.value).toBe('danger')
    monitor.stop()
  })

  it('polls every five seconds while running', async () => {
    vi.useFakeTimers()
    const monitor = useRoomMonitor({ roomId: ref('r1') })
    monitor.start()
    await vi.advanceTimersByTimeAsync(5000)
    await nextTick()

    expect(loadMonitor).toHaveBeenCalledTimes(2)
    monitor.stop()
  })

  it('reloads when the room changes', async () => {
    const roomId = ref('r1')
    const monitor = useRoomMonitor({ roomId })
    await nextTick()

    roomId.value = 'r2'
    await nextTick()

    expect(loadMonitor).toHaveBeenCalledWith(
      'r2',
      expect.objectContaining({ page: 1 }),
    )
    expect(monitor.page.value).toBe(1)
    monitor.stop()
  })
})
