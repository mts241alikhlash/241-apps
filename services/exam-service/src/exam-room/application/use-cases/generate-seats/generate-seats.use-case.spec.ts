import { ConflictException, NotFoundException } from '@nestjs/common'
import type { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { FakeExamRoomRepository } from '../../exam-room.repository.fake.js'
import { FakeStudentDirectory } from '../../../../exam-session/application/exam-session.test-support.js'
import { GenerateSeatsUseCase } from './generate-seats.use-case.js'

const CLASSROOM = 'classroom-7a'
const GRADE = 'grade-7'

async function setup(options: { roomCount?: number } = {}) {
  const rooms = new FakeExamRoomRepository()
  const event = await rooms.createEvent({
    semesterId: 'sem-1',
    name: 'UTS Ganjil',
    type: 'MIDTERM',
    startsAt: new Date('2026-11-02T01:00:00.000Z'),
    endsAt: new Date('2026-11-02T04:00:00.000Z'),
    createdById: 'admin-1',
  })
  for (let i = 0; i < (options.roomCount ?? 1); i++) {
    await rooms.createRoom({
      eventId: event.id,
      code: `R0${i + 1}`,
      name: `Ruang 0${i + 1}`,
      capacity: 8,
    })
  }
  const students = new FakeStudentDirectory([
    { id: 'f1', nis: '1', name: 'Anisa', gender: 'FEMALE' },
    { id: 'f2', nis: '2', name: 'Bella', gender: 'FEMALE' },
    { id: 'm1', nis: '3', name: 'Adi', gender: 'MALE' },
    { id: 'm2', nis: '4', name: 'Budi', gender: 'MALE' },
  ])
  const academic = {
    classroomsByIds: () =>
      Promise.resolve([
        { id: CLASSROOM, gradeId: GRADE, academicYearId: 'y', name: 'VII A' },
      ]),
    gradesByIds: () => Promise.resolve([{ id: GRADE, level: 7, name: 'VII' }]),
  } as unknown as IAcademicLookupPort
  const useCase = new GenerateSeatsUseCase(rooms, students, academic)
  const command = {
    eventId: event.id,
    mode: 'preview' as const,
    replaceExisting: false,
    students: ['f1', 'f2', 'm1', 'm2'].map((studentId) => ({
      studentId,
      classroomId: CLASSROOM,
    })),
    rules: {},
  }
  return { rooms, event, useCase, command }
}

describe('GenerateSeatsUseCase', () => {
  it('returns a plan for preview and never writes seats', async () => {
    const { rooms, useCase, command } = await setup()
    const replace = vi.spyOn(rooms, 'replaceSeats')

    const result = await useCase.execute(command)

    expect(result.applied).toBe(false)
    expect(result.plan.seats).toHaveLength(4)
    expect(result.rooms[0]).toEqual(
      expect.objectContaining({ code: 'R01', capacity: 8 }),
    )
    expect(replace).not.toHaveBeenCalled()
  })

  it('resolves the grade level through the classroom and grade', async () => {
    const { useCase, command } = await setup()

    const result = await useCase.execute(command)

    expect(result.plan.seats.every((seat) => seat.gradeLevel === 7)).toBe(true)
  })

  it('refuses to apply over existing seats without replaceExisting', async () => {
    const { rooms, event, useCase, command } = await setup()
    const [room] = await rooms.listRoomsByEvent(event.id)
    await rooms.assignSeat({
      roomId: room.id,
      eventId: event.id,
      studentId: 'old',
      classroomId: CLASSROOM,
      seatNumber: 1,
    })
    const replace = vi.spyOn(rooms, 'replaceSeats')

    await expect(
      useCase.execute({ ...command, mode: 'apply', replaceExisting: false }),
    ).rejects.toThrow(ConflictException)
    let error: unknown
    try {
      await useCase.execute({
        ...command,
        mode: 'apply',
        replaceExisting: false,
      })
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(ConflictException)
    expect((error as ConflictException).getResponse()).toEqual({
      code: 'SEATS_EXIST',
      message: 'Kursi periode ini sudah ada. Konfirmasi untuk menimpa.',
    })
    expect(replace).not.toHaveBeenCalled()
  })

  it('replaces the seats once with the planned desks when asked', async () => {
    const { rooms, useCase, command } = await setup()
    const replace = vi.spyOn(rooms, 'replaceSeats')

    const result = await useCase.execute({
      ...command,
      mode: 'apply',
      replaceExisting: true,
    })

    expect(result.applied).toBe(true)
    expect(replace).toHaveBeenCalledTimes(1)
    const [, roomIds, written] = replace.mock.calls[0]
    expect(roomIds).toEqual([result.rooms[0].roomId])
    expect(written.map((seat) => seat.seatNumber).sort()).toEqual(
      result.plan.seats.map((seat) => seat.desk).sort(),
    )
    expect(written).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ roomId: result.plan.seats[0].roomId }),
      ]),
    )
  })

  it('places females on the left block and males on the right', async () => {
    const { useCase, command } = await setup()

    const { plan } = await useCase.execute(command)

    for (const seat of plan.seats) {
      expect(seat.side).toBe(seat.gender === 'FEMALE' ? 'LEFT' : 'RIGHT')
    }
  })

  it('uses only the rooms named in roomIds, in code order', async () => {
    const { useCase, command } = await setup({ roomCount: 2 })

    const result = await useCase.execute({ ...command, roomIds: undefined })
    const picked = await useCase.execute({
      ...command,
      roomIds: [result.rooms[1].roomId],
    })

    expect(result.rooms.map((room) => room.code)).toEqual(['R01', 'R02'])
    expect(picked.rooms.map((room) => room.code)).toEqual(['R02'])
  })

  it('replaces only the seats of the planned rooms', async () => {
    const { rooms, event, useCase, command } = await setup({ roomCount: 2 })
    const [first, second] = await rooms.listRoomsByEvent(event.id)
    await rooms.assignSeat({
      roomId: second.id,
      eventId: event.id,
      studentId: 'elsewhere',
      classroomId: CLASSROOM,
      seatNumber: 1,
    })

    await useCase.execute({
      ...command,
      mode: 'apply',
      replaceExisting: true,
      roomIds: [first.id],
    })

    const kept = await rooms.listSeatsByRoom(second.id)
    expect(kept.map((seat) => seat.studentId)).toEqual(['elsewhere'])
  })

  it('leaves a student seated outside the planned rooms unseated', async () => {
    const { rooms, event, useCase, command } = await setup({ roomCount: 2 })
    const [first, second] = await rooms.listRoomsByEvent(event.id)
    await rooms.assignSeat({
      roomId: second.id,
      eventId: event.id,
      studentId: 'f1',
      classroomId: CLASSROOM,
      seatNumber: 1,
    })

    const { plan } = await useCase.execute({
      ...command,
      roomIds: [first.id],
    })

    expect(plan.seats.map((seat) => seat.studentId)).not.toContain('f1')
    expect(plan.unseated.map((student) => student.studentId)).toContain('f1')
  })

  it('reports a student with no directory ref as unseated', async () => {
    const { useCase, command } = await setup()

    const { plan } = await useCase.execute({
      ...command,
      students: [
        ...command.students,
        { studentId: 'ghost', classroomId: CLASSROOM },
      ],
    })

    expect(plan.seats.map((seat) => seat.studentId)).not.toContain('ghost')
    expect(plan.unseated.map((student) => student.studentId)).toContain('ghost')
  })

  it('reports a student whose classroom cannot be resolved as unseated', async () => {
    const { useCase, command } = await setup()

    const { plan } = await useCase.execute({
      ...command,
      students: command.students.map((student) =>
        student.studentId === 'f2'
          ? { ...student, classroomId: 'unknown-classroom' }
          : student,
      ),
    })

    expect(plan.seats.map((seat) => seat.studentId)).not.toContain('f2')
    expect(plan.unseated.map((student) => student.studentId)).toContain('f2')
  })

  it('throws NotFoundException for an unknown event', async () => {
    const { useCase, command } = await setup()

    await expect(
      useCase.execute({ ...command, eventId: 'missing' }),
    ).rejects.toThrow(NotFoundException)
  })

  it('throws NotFoundException when the event has no rooms', async () => {
    const { rooms, useCase, command } = await setup({ roomCount: 0 })
    expect(await rooms.listRoomsByEvent(command.eventId)).toEqual([])

    await expect(useCase.execute(command)).rejects.toThrow(NotFoundException)
  })
})
