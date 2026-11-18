import { NotFoundException } from '@nestjs/common'
import {
  CLASSROOM_7A,
  FakeAcademicLookup,
  SEMESTER_ID,
} from '../../../../exam-schedule/application/exam-schedule.test-support.js'
import {
  FakeParticipantNumber,
  FakeStudentDirectory,
} from '../../../../exam-session/application/exam-session.test-support.js'
import type { IEmployeeIdentityReadPort } from '../../../../platform/employee-identity/employee-identity.port.js'
import { FakeExamRoomRepository } from '../../exam-room.repository.fake.js'
import {
  CLASSROOM_8A,
  FakeAuthorLookup,
  LATER_SLOT_END,
  LATER_SLOT_START,
  SLOT_END,
  SLOT_START,
} from '../../room-monitor.test-support.js'
import { GetPrintPackUseCase } from './get-print-pack.use-case.js'

const EMPLOYEES: Record<string, string> = {
  'tech-1': 'emp-tech',
  'sup-1': 'emp-1',
  'sup-2': 'emp-2',
}

async function build(numbers = new Map<string, string>()) {
  const rooms = new FakeExamRoomRepository()
  const event = await rooms.createEvent({
    semesterId: SEMESTER_ID,
    name: 'UAS Ganjil',
    type: 'FINAL',
    startsAt: SLOT_START,
    endsAt: LATER_SLOT_END,
    createdById: 'admin-1',
  })
  const r2 = await rooms.createRoom({
    eventId: event.id,
    code: 'R02',
    name: 'Ruang 02',
    capacity: 10,
  })
  const r1 = await rooms.createRoom({
    eventId: event.id,
    code: 'R01',
    name: 'Ruang 01',
    building: 'Gedung A',
    capacity: 10,
    technicianUserId: 'tech-1',
  })
  const empty = await rooms.createRoom({
    eventId: event.id,
    code: 'R03',
    name: 'Ruang 03',
    capacity: 10,
  })
  const seat = (
    roomId: string,
    studentId: string,
    seatNumber: number,
    c = CLASSROOM_7A.id,
  ) =>
    rooms.assignSeat({
      roomId,
      eventId: event.id,
      studentId,
      classroomId: c,
      seatNumber,
    })
  await seat(r1.id, 's2', 2, CLASSROOM_8A.id)
  await seat(r1.id, 's1', 1)
  await seat(r2.id, 's3', 1)
  await seat(r2.id, 'ghost', 2)
  const students = new FakeStudentDirectory([
    { id: 's1', nis: '001', name: 'Siswa Satu' },
    { id: 's2', nis: '002', name: 'Siswa Dua' },
    { id: 's3', nis: '003', name: 'Siswa Tiga' },
  ])
  const participants = new FakeParticipantNumber({ numbers })
  const employees: IEmployeeIdentityReadPort = {
    findEmployeeIdByUserId: (userId) =>
      Promise.resolve(EMPLOYEES[userId] ?? null),
    employeeExists: () => Promise.resolve(true),
  }
  const authors = new FakeAuthorLookup({
    'emp-tech': 'Pak Teknisi',
    'emp-1': 'Ustadz Ahmad',
    'emp-2': 'Ustadz Budi',
  })
  const academic = new FakeAcademicLookup({
    classrooms: [CLASSROOM_7A, CLASSROOM_8A],
  })
  const useCase = new GetPrintPackUseCase(
    rooms,
    students,
    academic,
    participants,
    authors,
    employees,
  )
  return {
    rooms,
    event,
    r1,
    r2,
    empty,
    students,
    academic,
    participants,
    authors,
    employees,
    useCase,
  }
}

const ALL_NUMBERS = new Map([
  ['s1', 'P-1'],
  ['s2', 'P-2'],
  ['s3', 'P-3'],
])

describe('GetPrintPackUseCase', () => {
  it('orders rooms by code and students by seat number with names, nis, classrooms and numbers', async () => {
    const { useCase, event } = await build(ALL_NUMBERS)
    const pack = await useCase.execute(event.id)
    expect(pack.event).toEqual({
      id: event.id,
      name: 'UAS Ganjil',
      startsAt: event.startsAt,
      endsAt: event.endsAt,
    })
    expect(pack.rooms.map((room) => room.code)).toEqual(['R01', 'R02', 'R03'])
    expect(pack.rooms[0].building).toBe('Gedung A')
    expect(pack.rooms[0].students).toEqual([
      {
        seatNumber: 1,
        studentId: 's1',
        name: 'Siswa Satu',
        nis: '001',
        classroomName: CLASSROOM_7A.name,
        participantNumber: 'P-1',
      },
      {
        seatNumber: 2,
        studentId: 's2',
        name: 'Siswa Dua',
        nis: '002',
        classroomName: CLASSROOM_8A.name,
        participantNumber: 'P-2',
      },
    ])
    expect(pack.rooms[1].students[0].participantNumber).toBe('P-3')
  })

  it('returns a student the directory cannot find with null name and nis', async () => {
    const { useCase, event } = await build(ALL_NUMBERS)
    const pack = await useCase.execute(event.id)
    expect(pack.rooms[1].students[1]).toMatchObject({
      studentId: 'ghost',
      name: null,
      nis: null,
    })
  })

  it('leaves the number null and counts students without one in the warnings', async () => {
    const { useCase, event } = await build(
      new Map([
        ['s1', 'P-1'],
        ['s2', 'P-2'],
        ['ghost', 'P-9'],
      ]),
    )
    const pack = await useCase.execute(event.id)
    expect(pack.rooms[1].students[0].participantNumber).toBeNull()
    expect(pack.warnings).toEqual(['1 siswa belum bernomor peserta'])
  })

  it('has no warnings when every student has a number', async () => {
    const { useCase, event } = await build(
      new Map([...ALL_NUMBERS, ['ghost', 'P-9']]),
    )
    expect((await useCase.execute(event.id)).warnings).toEqual([])
  })

  it('shows the substitute name and orders supervisors by start', async () => {
    const { useCase, event, rooms, r1 } = await build(ALL_NUMBERS)
    await rooms.assignSupervisor({
      roomId: r1.id,
      startsAt: LATER_SLOT_START,
      endsAt: LATER_SLOT_END,
      scheduledUserId: 'sup-1',
    })
    const first = await rooms.assignSupervisor({
      roomId: r1.id,
      startsAt: SLOT_START,
      endsAt: SLOT_END,
      scheduledUserId: 'sup-1',
    })
    await rooms.substituteSupervisor({
      supervisorId: first.id,
      actualUserId: 'sup-2',
      substitutedByAdminId: 'admin-1',
      reason: 'sakit',
      at: SLOT_START,
    })
    const pack = await useCase.execute(event.id)
    expect(pack.rooms[0].supervisors).toEqual([
      { startsAt: SLOT_START, endsAt: SLOT_END, name: 'Ustadz Budi' },
      {
        startsAt: LATER_SLOT_START,
        endsAt: LATER_SLOT_END,
        name: 'Ustadz Ahmad',
      },
    ])
  })

  it('resolves each distinct staff user once across rooms', async () => {
    const { useCase, event, rooms, r1, r2, employees } =
      await build(ALL_NUMBERS)
    for (const room of [r1, r2]) {
      await rooms.assignSupervisor({
        roomId: room.id,
        startsAt: SLOT_START,
        endsAt: SLOT_END,
        scheduledUserId: 'sup-1',
      })
    }
    const spy = vi.spyOn(employees, 'findEmployeeIdByUserId')
    await useCase.execute(event.id)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('resolves the technician name and null when the room has none', async () => {
    const { useCase, event } = await build(ALL_NUMBERS)
    const pack = await useCase.execute(event.id)
    expect(pack.rooms[0].technician).toEqual({ name: 'Pak Teknisi' })
    expect(pack.rooms[1].technician).toBeNull()
  })

  it('rejects an unknown event', async () => {
    const { useCase } = await build()
    await expect(useCase.execute('missing')).rejects.toEqual(
      new NotFoundException('Acara ujian tidak ditemukan'),
    )
  })

  it('rejects a room of another event and returns only the requested room', async () => {
    const { useCase, event, r1, rooms } = await build(ALL_NUMBERS)
    const other = await rooms.createEvent({
      semesterId: SEMESTER_ID,
      name: 'Lain',
      type: 'FINAL',
      startsAt: SLOT_START,
      endsAt: SLOT_END,
      createdById: 'admin-1',
    })
    const foreign = await rooms.createRoom({
      eventId: other.id,
      code: 'X01',
      name: 'X',
      capacity: 1,
    })
    await expect(useCase.execute(event.id, foreign.id)).rejects.toEqual(
      new NotFoundException('Ruang tidak ditemukan'),
    )
    const pack = await useCase.execute(event.id, r1.id)
    expect(pack.rooms.map((room) => room.id)).toEqual([r1.id])
  })

  it('gives a room without seats an empty student list', async () => {
    const { useCase, event } = await build(ALL_NUMBERS)
    const pack = await useCase.execute(event.id)
    expect(pack.rooms[2].students).toEqual([])
  })

  it('calls the participant numbers once over the returned students, or not at all without seats', async () => {
    const { useCase, event, r1, participants, empty } = await build(ALL_NUMBERS)
    const spy = vi.spyOn(participants, 'findNumbers')
    await useCase.execute(event.id, r1.id)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(
      expect.arrayContaining(['s1', 's2']),
      SEMESTER_ID,
    )
    expect(spy.mock.calls[0][0]).toHaveLength(2)
    spy.mockClear()
    await useCase.execute(event.id)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toHaveLength(4)
    spy.mockClear()
    await useCase.execute(event.id, empty.id)
    expect(spy).not.toHaveBeenCalled()
  })
})
