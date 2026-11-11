import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examEventApi } from './examEventApi'

const { get, post, patch } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}))
vi.mock('@mts241alikhlash/web-shared/utils/api', () => ({
  default: { get, post, patch },
}))

const event = {
  semesterId: 'sem-1',
  name: 'UTS Ganjil',
  type: 'MIDTERM' as const,
  startsAt: '2026-11-02T01:00:00.000Z',
  endsAt: '2026-11-06T09:00:00.000Z',
  lateToleranceMinutes: 30,
  minSubmitMinutes: 20,
  requireAndroidApp: true,
}

const room = {
  code: 'R01',
  name: 'Ruang 01',
  building: 'Gedung A',
  capacity: 30,
  technicianUserId: 'u-1',
}

describe('examEventApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists events with the given filters and page', () => {
    void examEventApi.getEvents({
      page: 2,
      limit: 10,
      semesterId: 'sem-1',
      status: 'ACTIVE',
    })

    expect(get).toHaveBeenCalledWith('/exam-events', {
      params: { page: 2, limit: 10, semesterId: 'sem-1', status: 'ACTIVE' },
    })
  })

  it('reads, creates and updates an event', () => {
    void examEventApi.getEvent('e1')
    void examEventApi.createEvent(event)
    void examEventApi.updateEvent('e1', { status: 'ACTIVE' })

    expect(get).toHaveBeenCalledWith('/exam-events/e1')
    expect(post).toHaveBeenCalledWith('/exam-events', event)
    expect(patch).toHaveBeenCalledWith('/exam-events/e1', { status: 'ACTIVE' })
  })

  it('lists and creates the rooms of an event', () => {
    void examEventApi.getRooms('e1')
    void examEventApi.createRoom('e1', room)

    expect(get).toHaveBeenCalledWith('/exam-events/e1/rooms')
    expect(post).toHaveBeenCalledWith('/exam-events/e1/rooms', room)
  })

  it('updates a room and its seats', () => {
    void examEventApi.updateRoom('r1', { capacity: 40 })
    void examEventApi.getSeats('r1')
    void examEventApi.assignSeats('r1', [
      { studentId: 's1', classroomId: 'c1', seatNumber: 1 },
    ])

    expect(patch).toHaveBeenCalledWith('/exam-rooms/r1', { capacity: 40 })
    expect(get).toHaveBeenCalledWith('/exam-rooms/r1/seats')
    expect(post).toHaveBeenCalledWith('/exam-rooms/r1/seats', {
      students: [{ studentId: 's1', classroomId: 'c1', seatNumber: 1 }],
    })
  })

  it('reads and rotates the room token', () => {
    void examEventApi.getAccessCode('r1')
    void examEventApi.rotateToken('r1', { reason: 'Token bocor' })

    expect(get).toHaveBeenCalledWith('/exam-rooms/r1/access-code')
    expect(post).toHaveBeenCalledWith('/exam-rooms/r1/rotate-token', {
      reason: 'Token bocor',
    })
  })

  it('substitutes a supervisor with a reason', () => {
    void examEventApi.substituteSupervisor('r1', 'slot-1', {
      actualUserId: 'u2',
      reason: 'Pengawas sakit',
    })

    expect(post).toHaveBeenCalledWith(
      '/exam-rooms/r1/supervisors/slot-1/substitute',
      { actualUserId: 'u2', reason: 'Pengawas sakit' },
    )
  })

  it('extends the room time and flags one seat', () => {
    void examEventApi.extendRoomTime('r1', {
      minutes: 15,
      reason: 'Server lambat',
    })
    void examEventApi.allowWeb('r1', 's1', { reason: 'HP rusak' })
    void examEventApi.allowLate('r1', 's1', { reason: 'Terlambat masuk' })

    expect(post).toHaveBeenCalledWith('/exam-rooms/r1/extend-time', {
      minutes: 15,
      reason: 'Server lambat',
    })
    expect(post).toHaveBeenCalledWith('/exam-rooms/r1/seats/s1/allow-web', {
      reason: 'HP rusak',
    })
    expect(post).toHaveBeenCalledWith('/exam-rooms/r1/seats/s1/allow-late', {
      reason: 'Terlambat masuk',
    })
  })

  it('keeps an id inside its own path segment', () => {
    const hostile = '../../users/me?x=1#y'
    const safe = encodeURIComponent(hostile)

    void examEventApi.getEvent(hostile)
    void examEventApi.getRooms(hostile)
    void examEventApi.updateRoom(hostile, { capacity: 1 })
    void examEventApi.getAccessCode(hostile)

    const paths = [...get.mock.calls, ...patch.mock.calls].map((call) =>
      String(call[0]),
    )
    expect(paths).toHaveLength(4)
    for (const path of paths) expect(path).toContain(safe)
  })
})
