import { randomUUID } from 'node:crypto'
import type { ExamRoom } from '../domain/entities/exam-room.entity.js'
import {
  DuplicateRoomCodeError,
  ExamRoomConflictError,
  SeatAlreadyTakenError,
  uniqueConstraintOf,
  uniqueViolationError,
} from '../domain/errors/exam-room.errors.js'
import { FakeExamRoomRepository } from './exam-room.repository.fake.js'

const NOW = new Date('2026-11-02T02:00:00Z')

const event = () => ({
  semesterId: randomUUID(),
  name: 'UTS Ganjil',
  type: 'UTS' as const,
  startsAt: new Date('2026-11-02T01:00:00Z'),
  endsAt: new Date('2026-11-02T05:00:00Z'),
  createdById: randomUUID(),
})

async function setup(capacities: number[] = [2, 2]) {
  const rooms = new FakeExamRoomRepository()
  const created = await rooms.createEvent(event())
  const built: ExamRoom[] = []
  for (const [index, capacity] of capacities.entries()) {
    built.push(
      await rooms.createRoom({
        eventId: created.id,
        code: `R${index + 1}`,
        name: `Ruang ${index + 1}`,
        capacity,
      }),
    )
  }
  return { rooms, event: created, built }
}

describe('FakeExamRoomRepository seats', () => {
  it('seats a batch or nothing at all', async () => {
    const { rooms, event: created, built } = await setup()

    await expect(
      rooms.assignSeats([
        {
          roomId: built[0].id,
          eventId: created.id,
          studentId: 'student-1',
          classroomId: 'class-7a',
          seatNumber: 1,
        },
        {
          roomId: built[0].id,
          eventId: created.id,
          studentId: 'student-2',
          classroomId: 'class-7a',
          seatNumber: 1,
        },
      ]),
    ).rejects.toBeInstanceOf(SeatAlreadyTakenError)
    expect(await rooms.listSeatsByRoom(built[0].id)).toEqual([])
  })

  it('refuses the same student twice in one event', async () => {
    const { rooms, event: created, built } = await setup()

    await rooms.assignSeat({
      roomId: built[0].id,
      eventId: created.id,
      studentId: 'student-1',
      classroomId: 'class-7a',
      seatNumber: 1,
    })

    await expect(
      rooms.assignSeat({
        roomId: built[1].id,
        eventId: created.id,
        studentId: 'student-1',
        classroomId: 'class-7a',
        seatNumber: 1,
      }),
    ).rejects.toBeInstanceOf(SeatAlreadyTakenError)
  })

  it('refuses the same seat number twice in one room', async () => {
    const { rooms, event: created, built } = await setup()

    await rooms.assignSeat({
      roomId: built[0].id,
      eventId: created.id,
      studentId: 'student-1',
      classroomId: 'class-7a',
      seatNumber: 1,
    })

    await expect(
      rooms.assignSeat({
        roomId: built[0].id,
        eventId: created.id,
        studentId: 'student-2',
        classroomId: 'class-7a',
        seatNumber: 1,
      }),
    ).rejects.toBeInstanceOf(SeatAlreadyTakenError)
  })

  it('allows the same seat number in a different room', async () => {
    const { rooms, event: created, built } = await setup()

    await rooms.assignSeat({
      roomId: built[0].id,
      eventId: created.id,
      studentId: 'student-1',
      classroomId: 'class-7a',
      seatNumber: 1,
    })
    const other = await rooms.assignSeat({
      roomId: built[1].id,
      eventId: created.id,
      studentId: 'student-2',
      classroomId: 'class-7a',
      seatNumber: 1,
    })

    expect(other.seatNumber).toBe(1)
    expect(await rooms.findSeat(created.id, 'student-2')).not.toBeNull()
    expect(await rooms.findSeat(created.id, 'student-3')).toBeNull()
  })

  it("returns only the student's own room and seat", async () => {
    const { rooms, event: created, built } = await setup()

    await rooms.assignSeat({
      roomId: built[0].id,
      eventId: created.id,
      studentId: 'student-1',
      classroomId: 'class-7a',
      seatNumber: 7,
    })

    expect(await rooms.findSeatForStudent(created.id, 'student-1')).toEqual({
      roomName: 'Ruang 1',
      seatNumber: 7,
    })
    expect(await rooms.findSeatForStudent(created.id, 'student-2')).toBeNull()
  })

  it('refuses to rename a room onto a code already used in the event', async () => {
    const { rooms, built } = await setup([2, 2])

    await expect(
      rooms.updateRoom(built[1].id, { code: built[0].code }),
    ).rejects.toBeInstanceOf(DuplicateRoomCodeError)
    expect((await rooms.findRoomById(built[1].id))?.code).toBe('R2')
  })

  it('refuses a duplicate room code inside one event', async () => {
    const { rooms, event: created } = await setup([2])

    await expect(
      rooms.createRoom({
        eventId: created.id,
        code: 'R1',
        name: 'Ruang lain',
        capacity: 3,
      }),
    ).rejects.toBeInstanceOf(DuplicateRoomCodeError)
  })

  it('distributes seats across rooms and stops at capacity', async () => {
    const { rooms, event: created, built } = await setup([1, 1])

    const result = await rooms.autoDistributeSeats({
      eventId: created.id,
      roomIds: built.map((room) => room.id),
      students: [
        { studentId: 'a', classroomId: 'class-7a' },
        { studentId: 'b', classroomId: 'class-7a' },
        { studentId: 'c', classroomId: 'class-7a' },
      ],
    })

    expect(result.assigned).toHaveLength(2)
    expect(result.unassigned.map((row) => row.studentId)).toEqual(['c'])
    expect(result.assigned.map((row) => row.seatNumber)).toEqual([1, 1])
    expect(new Set(result.assigned.map((row) => row.roomId)).size).toBe(2)
  })

  it('interleaves grades when asked, and groups them when not', async () => {
    const { rooms, event: created, built } = await setup([4])

    const interleaved = await rooms.autoDistributeSeats({
      eventId: created.id,
      roomIds: built.map((room) => room.id),
      interleaveByClassroom: true,
      students: [
        { studentId: 'a1', classroomId: 'class-7a' },
        { studentId: 'a2', classroomId: 'class-7a' },
        { studentId: 'b1', classroomId: 'class-8a' },
        { studentId: 'b2', classroomId: 'class-8a' },
      ],
    })

    expect(interleaved.assigned.map((row) => row.studentId)).toEqual([
      'a1',
      'b1',
      'a2',
      'b2',
    ])

    const fresh = await setup([4])
    const grouped = await fresh.rooms.autoDistributeSeats({
      eventId: fresh.event.id,
      roomIds: fresh.built.map((room) => room.id),
      students: [
        { studentId: 'a1', classroomId: 'class-7a' },
        { studentId: 'a2', classroomId: 'class-7a' },
        { studentId: 'b1', classroomId: 'class-8a' },
        { studentId: 'b2', classroomId: 'class-8a' },
      ],
    })

    expect(grouped.assigned.map((row) => row.studentId)).toEqual([
      'a1',
      'a2',
      'b1',
      'b2',
    ])
  })

  it('ignores room ids that belong to another event', async () => {
    const { rooms, built } = await setup([2])
    const other = await rooms.createEvent(event())
    const foreign = await rooms.createRoom({
      eventId: other.id,
      code: 'X1',
      name: 'Ruang lain',
      capacity: 5,
    })

    const result = await rooms.autoDistributeSeats({
      eventId: other.id,
      roomIds: [...built.map((room) => room.id), foreign.id, randomUUID()],
      students: [{ studentId: 'a1', classroomId: 'class-7a' }],
    })

    expect(result.assigned.map((row) => row.roomId)).toEqual([foreign.id])
    expect(await rooms.listSeatsByEvent(built[0].eventId)).toEqual([])
  })

  it('does not seat a student twice when run again', async () => {
    const { rooms, event: created, built } = await setup([2])
    const students = [{ studentId: 'a1', classroomId: 'class-7a' }]

    await rooms.autoDistributeSeats({
      eventId: created.id,
      roomIds: built.map((room) => room.id),
      students,
    })
    const second = await rooms.autoDistributeSeats({
      eventId: created.id,
      roomIds: built.map((room) => room.id),
      students,
    })

    expect(second.assigned).toEqual([])
    expect(second.unassigned.map((row) => row.studentId)).toEqual(['a1'])
    expect(await rooms.listSeatsByEvent(created.id)).toHaveLength(1)
  })
})

describe('FakeExamRoomRepository supervisors', () => {
  const slot = (
    roomId: string,
    startsAt: string,
    endsAt: string,
    scheduledUserId: string,
  ) => ({
    roomId,
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    scheduledUserId,
  })

  it('finds the supervisor on duty at a moment and nobody outside it', async () => {
    const { rooms, built } = await setup([2])
    await rooms.assignSupervisor(
      slot(built[0].id, '2026-11-02T01:00:00Z', '2026-11-02T02:00:00Z', 'u1'),
    )
    await rooms.assignSupervisor(
      slot(built[0].id, '2026-11-02T02:00:00Z', '2026-11-02T03:00:00Z', 'u2'),
    )

    expect(
      (
        await rooms.findSupervisorAt(
          built[0].id,
          new Date('2026-11-02T01:30:00Z'),
        )
      )?.actualUserId,
    ).toBe('u1')
    expect(
      (
        await rooms.findSupervisorAt(
          built[0].id,
          new Date('2026-11-02T02:00:00Z'),
        )
      )?.actualUserId,
    ).toBe('u2')
    expect(
      await rooms.findSupervisorAt(
        built[0].id,
        new Date('2026-11-02T04:00:00Z'),
      ),
    ).toBeNull()
  })

  it('finds which room a user supervises at a moment', async () => {
    const { rooms, built } = await setup([2, 2])
    await rooms.assignSupervisor(
      slot(built[1].id, '2026-11-02T01:00:00Z', '2026-11-02T02:00:00Z', 'u1'),
    )

    const found = await rooms.findSupervisorSlotForUser(
      built[1].id,
      'u1',
      new Date('2026-11-02T01:15:00Z'),
    )

    expect(found?.roomId).toBe(built[1].id)
    expect(
      await rooms.findSupervisorSlotForUser(
        built[1].id,
        'u1',
        new Date('2026-11-02T02:30:00Z'),
      ),
    ).toBeNull()
  })

  it('records a substitute without losing the scheduled supervisor', async () => {
    const { rooms, built } = await setup([2])
    const assigned = await rooms.assignSupervisor(
      slot(built[0].id, '2026-11-02T01:00:00Z', '2026-11-02T02:00:00Z', 'u1'),
    )

    const substituted = await rooms.substituteSupervisor({
      supervisorId: assigned.id,
      actualUserId: 'u9',
      substitutedByAdminId: 'admin-1',
      reason: 'Pengawas asli sakit',
      at: new Date('2026-11-02T01:10:00Z'),
    })

    expect(substituted?.scheduledUserId).toBe('u1')
    expect(substituted?.actualUserId).toBe('u9')
    expect(substituted?.substituteReason).toBe('Pengawas asli sakit')
    expect(
      await rooms.findSupervisorSlotForUser(
        built[0].id,
        'u9',
        new Date('2026-11-02T01:15:00Z'),
      ),
    ).not.toBeNull()
    expect(
      await rooms.findSupervisorSlotForUser(
        built[0].id,
        'u1',
        new Date('2026-11-02T01:15:00Z'),
      ),
    ).toBeNull()
    expect(
      await rooms.substituteSupervisor({
        supervisorId: randomUUID(),
        actualUserId: 'u9',
        substitutedByAdminId: 'admin-1',
        reason: 'x',
        at: new Date(),
      }),
    ).toBeNull()
  })
})

describe('FakeExamRoomRepository session logs', () => {
  it('stores a batch of session events once per client id', async () => {
    const rooms = new FakeExamRoomRepository()
    const events = [
      {
        clientId: 'c1',
        type: 'LEFT_APP' as const,
        isViolation: false,
        detail: null,
        occurredAt: new Date('2026-11-02T01:05:00Z'),
      },
      {
        clientId: 'c2',
        type: 'SCREEN_OFF' as const,
        isViolation: true,
        detail: 'layar mati',
        occurredAt: new Date('2026-11-02T01:06:00Z'),
      },
    ]

    const first = await rooms.recordSessionEvents('s1', events)
    const second = await rooms.recordSessionEvents('s1', events)

    expect(first).toHaveLength(2)
    expect(second).toHaveLength(2)
    expect(await rooms.listSessionEvents('s1')).toHaveLength(2)
    expect(await rooms.listSessionEvents('s2')).toEqual([])
  })

  it('keeps the audit trail of recovery actions', async () => {
    const rooms = new FakeExamRoomRepository()

    await rooms.writeAuditLog({
      sessionId: 's1',
      roomId: 'r1',
      action: 'REOPEN_SESSION',
      actorId: 'tech-1',
      reason: 'Salah tekan kumpul',
    })

    const logs = await rooms.listAuditLogs('s1')
    expect(logs).toHaveLength(1)
    expect(logs[0].metadata).toEqual({})
    expect(logs[0].reason).toBe('Salah tekan kumpul')
    expect(await rooms.listAuditLogsByRoom('r1')).toEqual(logs)
    expect(await rooms.listAuditLogsByRoom('r2')).toEqual([])
  })

  it('reads room-level actions that carry no session id', async () => {
    const rooms = new FakeExamRoomRepository()

    await rooms.writeAuditLog({
      roomId: 'r1',
      action: 'ROTATE_ROOM_TOKEN',
      actorId: 'tech-1',
      reason: 'Token bocor',
    })
    await rooms.writeAuditLog({
      roomId: 'r1',
      action: 'SUBSTITUTE_SUPERVISOR',
      actorId: 'admin-1',
      reason: 'Pengawas sakit',
    })

    expect(await rooms.listAuditLogs('s1')).toEqual([])
    const byRoom = await rooms.listAuditLogsByRoom('r1')
    expect(byRoom.map((row) => row.action)).toEqual([
      'ROTATE_ROOM_TOKEN',
      'SUBSTITUTE_SUPERVISOR',
    ])
    expect(byRoom.every((row) => row.sessionId === null)).toBe(true)
  })
})

describe('unique violation mapping', () => {
  it('reads the constraint from the driver adapter shape', () => {
    expect(
      uniqueConstraintOf({
        driverAdapterError: {
          cause: { constraint: { index: 'exam_rooms_event_id_code_key' } },
        },
      }),
    ).toBe('exam_rooms_event_id_code_key')
  })

  it('reads the constraint from the plain target shape', () => {
    expect(uniqueConstraintOf({ target: ['event_id', 'code'] })).toBe(
      'event_id_code',
    )
    expect(
      uniqueConstraintOf({ target: 'exam_room_seats_room_id_seat_number_key' }),
    ).toBe('exam_room_seats_room_id_seat_number_key')
  })

  it('maps known constraints to domain errors', () => {
    expect(uniqueViolationError('exam_rooms_event_id_code_key')).toBeInstanceOf(
      DuplicateRoomCodeError,
    )
    expect(
      uniqueViolationError('exam_room_seats_room_id_seat_number_key'),
    ).toBeInstanceOf(SeatAlreadyTakenError)
    expect(
      uniqueViolationError('exam_room_seats_event_id_student_id_key'),
    ).toBeInstanceOf(SeatAlreadyTakenError)
  })

  it('falls back to a conflict error for an unknown constraint', () => {
    const mapped = uniqueViolationError('some_future_index_key')
    expect(mapped).toBeInstanceOf(ExamRoomConflictError)
    expect((mapped as ExamRoomConflictError).constraint).toBe(
      'some_future_index_key',
    )
    expect(uniqueViolationError('')).toBeInstanceOf(ExamRoomConflictError)
  })
})

describe('FakeExamRoomRepository reports', () => {
  it('keeps one report per supervisor slot and tracks the lifecycle', async () => {
    const { rooms, event: created, built } = await setup()
    const slot = await rooms.assignSupervisor({
      roomId: built[0].id,
      startsAt: new Date('2026-11-02T01:00:00Z'),
      endsAt: new Date('2026-11-02T02:00:00Z'),
      scheduledUserId: randomUUID(),
    })
    const report = await rooms.createReport({
      roomId: built[0].id,
      supervisorSlotId: slot.id,
    })

    expect(report.status).toBe('DRAFT')
    expect(report.condition).toBe('SMOOTH')
    await expect(
      rooms.createReport({
        roomId: built[0].id,
        supervisorSlotId: slot.id,
      }),
    ).rejects.toBeInstanceOf(ExamRoomConflictError)

    const drafted = await rooms.saveReportDraft(report.id, {
      condition: 'DISCIPLINARY_NOTE',
      incidentNotes: 'Ada siswa membawa HP',
    })
    expect(drafted?.condition).toBe('DISCIPLINARY_NOTE')

    const scheduleId = randomUUID()
    const studentId = randomUUID()
    await rooms.recordAbsence({
      reportId: report.id,
      studentId,
      scheduleId,
      reason: 'SICK',
      note: 'Demam tinggi',
      recordedBy: slot.actualUserId,
    })
    await rooms.recordAbsence({
      reportId: report.id,
      studentId,
      scheduleId,
      reason: 'PERMITTED',
      note: 'Izin keluarga',
      recordedBy: slot.actualUserId,
    })
    const absences = await rooms.listAbsencesByScheduleStudent(
      scheduleId,
      studentId,
    )
    expect(absences.map((row) => row.reason)).toEqual(['PERMITTED'])

    const note = await rooms.recordFieldNote({
      reportId: report.id,
      studentId,
      category: 'DEVICE',
      note: 'HP restarted',
      recordedBy: slot.actualUserId,
    })
    expect(note?.sessionId).toBeNull()

    expect(
      await rooms.verifyReport(report.id, created.createdById, NOW),
    ).toBeNull()

    expect(
      (await rooms.submitReport(report.id, slot.actualUserId, NOW))?.status,
    ).toBe('SUBMITTED')
    expect(
      await rooms.submitReport(report.id, slot.actualUserId, NOW),
    ).toBeNull()

    expect(
      (await rooms.verifyReport(report.id, created.createdById, NOW))?.status,
    ).toBe('VERIFIED')
    expect(
      await rooms.verifyReport(report.id, created.createdById, NOW),
    ).toBeNull()
    expect(await rooms.saveReportDraft(randomUUID(), {})).toBeNull()
    expect((await rooms.findReportBySlot(built[0].id, slot.id))?.status).toBe(
      'VERIFIED',
    )
  })

  it('leaves an undefined draft field alone and clears an explicit null', async () => {
    const { rooms, built } = await setup()
    const slot = await rooms.assignSupervisor({
      roomId: built[0].id,
      startsAt: new Date('2026-11-02T01:00:00Z'),
      endsAt: new Date('2026-11-02T02:00:00Z'),
      scheduledUserId: randomUUID(),
    })
    const report = await rooms.createReport({
      roomId: built[0].id,
      supervisorSlotId: slot.id,
      incidentNotes: 'Proyektor mati',
    })

    const kept = await rooms.saveReportDraft(report.id, {
      incidentNotes: undefined,
    })
    expect(kept?.incidentNotes).toBe('Proyektor mati')
    expect(kept?.condition).toBe('SMOOTH')

    const cleared = await rooms.saveReportDraft(report.id, {
      incidentNotes: null,
    })
    expect(cleared?.incidentNotes).toBeNull()
  })
})
