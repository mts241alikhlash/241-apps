import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examRoomService } from './examRoomService'

const { getMonitor } = vi.hoisted(() => ({ getMonitor: vi.fn() }))
vi.mock('../api/examRoomApi', () => ({
  examRoomApi: { getMonitor },
}))

const row = (seatNumber: number) => ({
  seatNumber,
  studentId: `st${seatNumber}`,
  studentName: `Siswa ${seatNumber}`,
  nis: String(seatNumber),
  classroomName: 'VII A',
  subjectName: 'Matematika',
  packageTitle: 'UAS Ganjil',
  scheduleId: 's1',
  totalQuestions: 40,
  session: null,
  absence: null,
})

const page = (rows: ReturnType<typeof row>[], total: number) => ({
  data: { data: rows, meta: { total } },
})

describe('examRoomService.loadRoster', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads every page until the roster total is reached', async () => {
    getMonitor
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 100 }, (_, i) => row(i + 1)),
          130,
        ),
      )
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 30 }, (_, i) => row(i + 101)),
          130,
        ),
      )

    const result = await examRoomService.loadRoster('r1', 'slot1')

    expect(result.data).toHaveLength(130)
    expect(result.total).toBe(130)
    expect(getMonitor).toHaveBeenCalledTimes(2)
    expect(getMonitor).toHaveBeenLastCalledWith('r1', {
      page: 2,
      limit: 100,
      slotId: 'slot1',
    })
  })

  it('stops when a page adds no new student instead of inflating the roster', async () => {
    const repeated = Array.from({ length: 100 }, (_, i) => row(i + 1))
    getMonitor
      .mockResolvedValueOnce(page(repeated, 250))
      .mockResolvedValueOnce(page(repeated, 250))

    const result = await examRoomService.loadRoster('r1', '')

    expect(result.data).toHaveLength(100)
    expect(result.total).toBe(250)
    expect(getMonitor).toHaveBeenCalledTimes(2)
  })

  it('returns what it read when the backend answers an empty page', async () => {
    getMonitor.mockResolvedValueOnce(page([row(1)], 40)).mockResolvedValueOnce({
      data: { data: [], meta: { total: 40 } },
    })

    const result = await examRoomService.loadRoster('r1', '')

    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(40)
  })
})
