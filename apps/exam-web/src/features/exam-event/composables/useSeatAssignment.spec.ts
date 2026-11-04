import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSeatAssignment } from './useSeatAssignment'

const { loadSeats, loadCandidates, assignSeats, distributeSeats } = vi.hoisted(
  () => ({
    loadSeats: vi.fn(),
    loadCandidates: vi.fn(),
    assignSeats: vi.fn(),
    distributeSeats: vi.fn(),
  }),
)
vi.mock('../services/examEventService', () => ({
  examEventService: { loadSeats, loadCandidates, assignSeats, distributeSeats },
}))

const rooms = [
  {
    id: 'r1',
    eventId: 'e1',
    code: 'R01',
    name: 'Ruang 01',
    building: null,
    capacity: 30,
    technicianUserId: null,
    tokenRotation: 0,
  },
]

const seated = [
  {
    studentId: 's1',
    classroomId: 'c1',
    seatNumber: 1,
    name: 'Ahmad',
    nis: '001',
    classroomName: 'VII A',
  },
]

const candidates = [
  {
    studentId: 's1',
    classroomId: 'c1',
    name: 'Ahmad',
    nis: '001',
    classroomName: 'VII A',
  },
  {
    studentId: 's2',
    classroomId: 'c1',
    name: 'Budi',
    nis: '002',
    classroomName: 'VII A',
  },
]

describe('useSeatAssignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadSeats.mockResolvedValue({ success: true, data: seated })
    loadCandidates.mockResolvedValue(candidates)
  })

  it('offers only the students who are not seated yet', async () => {
    const panel = useSeatAssignment(
      () => rooms,
      () => 'sem-1',
    )

    await panel.load('r1')

    expect(loadSeats).toHaveBeenCalledWith('r1', 'sem-1')
    expect(panel.available.value.map((row) => row.studentId)).toEqual(['s2'])
    expect(panel.nextSeatNumber.value).toBe(2)
  })

  it('clears the seats when no room is chosen', async () => {
    const panel = useSeatAssignment(
      () => rooms,
      () => 'sem-1',
    )

    await panel.load('r1')
    await panel.load('')

    expect(panel.seats.value).toEqual([])
    expect(panel.roomId.value).toBe('')
  })

  it('reloads the seats after a successful assignment', async () => {
    assignSeats.mockResolvedValue({ success: true, data: [] })
    const panel = useSeatAssignment(
      () => rooms,
      () => 'sem-1',
    )
    await panel.load('r1')

    const done = await panel.assign([
      { studentId: 's2', classroomId: 'c1', seatNumber: 2 },
    ])

    expect(done).toBe(true)
    expect(assignSeats).toHaveBeenCalledWith('r1', [
      { studentId: 's2', classroomId: 'c1', seatNumber: 2 },
    ])
    expect(loadSeats).toHaveBeenCalledTimes(2)
  })

  it('keeps the seats and reports the error when the assignment fails', async () => {
    assignSeats.mockResolvedValue({
      success: false,
      error: 'Kursi sudah dipakai',
    })
    const panel = useSeatAssignment(
      () => rooms,
      () => 'sem-1',
    )
    await panel.load('r1')

    const done = await panel.assign([
      { studentId: 's2', classroomId: 'c1', seatNumber: 1 },
    ])

    expect(done).toBe(false)
    expect(panel.error.value).toBe('Kursi sudah dipakai')
    expect(loadSeats).toHaveBeenCalledTimes(1)
  })

  it('names the chosen room for the panel header', async () => {
    const panel = useSeatAssignment(
      () => rooms,
      () => 'sem-1',
    )
    await panel.load('r1')

    expect(panel.roomName.value).toBe('Ruang 01')
  })

  it('auto distributes every candidate across the given rooms', async () => {
    distributeSeats.mockResolvedValue({ success: true, data: [] })
    const panel = useSeatAssignment(
      () => rooms,
      () => 'sem-1',
    )
    await panel.load('r1')

    const done = await panel.distribute(['r1'], true)

    expect(done).toBe(true)
    expect(distributeSeats).toHaveBeenCalledWith(
      'r1',
      expect.arrayContaining([{ studentId: 's2', classroomId: 'c1' }]),
      ['r1'],
      true,
    )
    expect(loadSeats).toHaveBeenCalledTimes(2)
  })
})
