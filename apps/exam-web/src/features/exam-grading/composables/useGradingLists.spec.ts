import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useEventGradingSchedules } from './useGradingLists'
import type { GradingSchedule } from '../types'

const { loadEvents, getSchedules } = vi.hoisted(() => ({
  loadEvents: vi.fn(),
  getSchedules: vi.fn(),
}))

vi.mock('@/features/exam-event/services/examEventService', () => ({
  examEventService: { loadEvents },
}))
vi.mock('../api/examGradingApi', () => ({
  examGradingApi: { getSchedules },
}))

const makeSchedule = (
  overrides: Partial<GradingSchedule> = {},
): GradingSchedule => ({
  id: 's1',
  title: 'UTS Matematika',
  packageId: 'p1',
  durationMinutes: 90,
  kind: 'REGULAR',
  subjectId: 'sub-1',
  classroomId: 'c1',
  classroomName: 'VII A',
  semesterId: 'sem-1',
  type: 'MIDTERM',
  category: 'EXAM',
  startsAt: '2026-11-23T01:00:00.000Z',
  endsAt: '2026-11-23T02:30:00.000Z',
  sessions: 20,
  awaitingGrading: 4,
  graded: 16,
  ...overrides,
})

describe('useEventGradingSchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads exam events and schedules for teachers when GET /exam-events succeeds', async () => {
    loadEvents.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'ev-active',
          name: 'UTS Ganjil',
          status: 'ACTIVE',
          startsAt: '2026-11-20T00:00:00.000Z',
          endsAt: '2026-11-30T23:59:59.000Z',
        },
        {
          id: 'ev-other',
          name: 'UAS Ganjil',
          status: 'DRAFT',
          startsAt: '2026-12-10T00:00:00.000Z',
          endsAt: '2026-12-20T23:59:59.000Z',
        },
      ],
    })
    getSchedules.mockResolvedValue({
      data: [
        makeSchedule({ id: 's-in-event' }),
        makeSchedule({
          id: 's-outside',
          startsAt: '2026-12-12T01:00:00.000Z',
          endsAt: '2026-12-12T02:30:00.000Z',
        }),
      ],
      meta: { total: 2 },
    })

    const state = useEventGradingSchedules(ref(1), ref(25))
    await state.refresh()

    expect(loadEvents).toHaveBeenCalledWith({ limit: 200 })
    expect(getSchedules).toHaveBeenCalledWith({
      page: 1,
      limit: 100,
      category: 'EXAM',
    })
    expect(state.listError.value).toBeNull()
    expect(state.eventId.value).toBe('ev-active')
    expect(state.schedules.value.map((s) => s.id)).toEqual(['s-in-event'])
  })

  it('sets listError when loading exam events fails', async () => {
    loadEvents.mockResolvedValue({
      success: false,
      error: 'Akses ditolak',
    })

    const state = useEventGradingSchedules(ref(1), ref(25))
    await state.refresh()

    expect(state.listError.value).toBe('Gagal memuat daftar ujian.')
    expect(getSchedules).not.toHaveBeenCalled()
  })
})
