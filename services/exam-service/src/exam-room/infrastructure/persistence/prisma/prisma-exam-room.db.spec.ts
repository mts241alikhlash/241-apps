import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { FakeExamRoomRepository } from '../../../application/exam-room.repository.fake.js'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { PrismaExamSessionRepository } from '../../../../exam-session/infrastructure/persistence/prisma/prisma-exam-session.repository.js'
import {
  DuplicateRoomCodeError,
  ExamRoomConflictError,
  SeatAlreadyTakenError,
} from '../../../domain/errors/exam-room.errors.js'
import type { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'
import { PrismaExamRoomRepository } from './prisma-exam-room.repository.js'

const enabled = process.env.EXAM_DB_TESTS === '1'
const suite = enabled ? describe : describe.skip

suite('Prisma exam rooms against a real database', () => {
  const prisma = new PrismaService({
    get: (key: string) => process.env[key],
  } as unknown as ConfigService)
  const rooms = new PrismaExamRoomRepository(prisma)
  const sessions = new PrismaExamSessionRepository(prisma)

  const id = () => randomUUID()
  const semesterId = id()
  const classroomId = id()
  const classroom7A = id()
  const classroom8A = id()
  const gradeId = id()
  const subjectId = id()
  const userId = id()
  const studentOne = id()
  const studentTwo = id()
  const students = {
    a1: id(),
    a2: id(),
    b1: id(),
  }
  const supervisorA = id()
  const supervisorB = id()
  const eventIds: string[] = []
  const packageIds: string[] = []
  const scheduleIds: string[] = []
  const sessionIds: string[] = []

  async function event() {
    const created = await rooms.createEvent({
      semesterId,
      name: 'UTS Ganjil',
      type: 'MIDTERM',
      startsAt: new Date('2026-11-02T01:00:00Z'),
      endsAt: new Date('2026-11-02T05:00:00Z'),
      createdById: userId,
    })
    eventIds.push(created.id)
    return created
  }

  async function room(eventId: string, code: string, capacity = 2) {
    return rooms.createRoom({ eventId, code, name: `Ruang ${code}`, capacity })
  }

  async function schedule() {
    const pkg = await prisma.examPackage.create({
      data: { title: 'Room DB', subjectId, gradeId, createdById: userId },
    })
    packageIds.push(pkg.id)
    const row = await prisma.examSchedule.create({
      data: {
        packageId: pkg.id,
        classroomId,
        semesterId,
        startsAt: new Date('2026-11-02T01:00:00Z'),
        endsAt: new Date('2026-11-02T03:00:00Z'),
        durationMinutes: 90,
        type: 'MIDTERM',
        createdById: userId,
      },
    })
    scheduleIds.push(row.id)
    return row
  }

  async function session(scheduleId: string, studentId: string) {
    const row = await prisma.examSession.create({
      data: {
        scheduleId,
        studentId,
        userId: id(),
        deviceId: 'dev',
        shuffleSeed: 'seed',
        startedAt: new Date('2026-11-02T01:00:00Z'),
        deadline: new Date('2026-11-02T02:30:00Z'),
        finalizeAt: new Date('2026-11-02T02:40:00Z'),
      },
    })
    sessionIds.push(row.id)
    return row
  }

  afterAll(async () => {
    await prisma.examSessionEvent.deleteMany({
      where: { sessionId: { in: sessionIds } },
    })
    await prisma.examSessionAuditLog.deleteMany({
      where: { sessionId: { in: sessionIds } },
    })
    await prisma.examSession.deleteMany({ where: { id: { in: sessionIds } } })
    await prisma.examSchedule.deleteMany({ where: { id: { in: scheduleIds } } })
    await prisma.examPackage.deleteMany({ where: { id: { in: packageIds } } })
    await prisma.examRoomSupervisor.deleteMany({
      where: { room: { eventId: { in: eventIds } } },
    })
    await prisma.examRoomSeat.deleteMany({
      where: { eventId: { in: eventIds } },
    })
    await prisma.examRoom.deleteMany({ where: { eventId: { in: eventIds } } })
    await prisma.examEvent.deleteMany({ where: { id: { in: eventIds } } })
    await prisma.$disconnect()
  })

  it('refuses a duplicate seat for one student in one event', async () => {
    const created = await event()
    const first = await room(created.id, 'R1')
    const second = await room(created.id, 'R2')

    await rooms.assignSeat({
      roomId: first.id,
      eventId: created.id,
      studentId: studentOne,
      classroomId,
      seatNumber: 1,
    })

    await expect(
      rooms.assignSeat({
        roomId: second.id,
        eventId: created.id,
        studentId: studentOne,
        classroomId,
        seatNumber: 1,
      }),
    ).rejects.toBeInstanceOf(SeatAlreadyTakenError)
  })

  it('seats a batch or rolls the whole batch back', async () => {
    const created = await event()
    const first = await room(created.id, 'R1')

    await expect(
      rooms.assignSeats([
        {
          roomId: first.id,
          eventId: created.id,
          studentId: studentOne,
          classroomId,
          seatNumber: 1,
        },
        {
          roomId: first.id,
          eventId: created.id,
          studentId: studentTwo,
          classroomId,
          seatNumber: 1,
        },
      ]),
    ).rejects.toBeInstanceOf(SeatAlreadyTakenError)
    expect(await rooms.listSeatsByRoom(first.id)).toEqual([])
  })

  it('refuses a duplicate seat number in one room', async () => {
    const created = await event()
    const first = await room(created.id, 'R1')

    await rooms.assignSeat({
      roomId: first.id,
      eventId: created.id,
      studentId: studentOne,
      classroomId,
      seatNumber: 1,
    })

    await expect(
      rooms.assignSeat({
        roomId: first.id,
        eventId: created.id,
        studentId: studentTwo,
        classroomId,
        seatNumber: 1,
      }),
    ).rejects.toBeInstanceOf(SeatAlreadyTakenError)
  })

  it("returns only the student's own room and seat", async () => {
    const created = await event()
    const first = await rooms.createRoom({
      eventId: created.id,
      code: 'R-1',
      name: 'Ruang 1',
      capacity: 30,
    })

    await rooms.assignSeat({
      roomId: first.id,
      eventId: created.id,
      studentId: studentOne,
      classroomId,
      seatNumber: 7,
    })

    expect(await rooms.findSeatForStudent(created.id, studentOne)).toEqual({
      roomName: 'Ruang 1',
      seatNumber: 7,
    })
    expect(await rooms.findSeatForStudent(created.id, studentTwo)).toBeNull()
  })

  it('refuses a duplicate room code in one event', async () => {
    const created = await event()
    await room(created.id, 'R1')

    await expect(room(created.id, 'R1')).rejects.toBeInstanceOf(
      DuplicateRoomCodeError,
    )
  })

  it('maps a renamed room code onto the domain error', async () => {
    const created = await event()
    const first = await room(created.id, 'R1')
    await room(created.id, 'R2')

    await expect(
      rooms.updateRoom(first.id, { code: 'R2' }),
    ).rejects.toBeInstanceOf(DuplicateRoomCodeError)
    expect((await rooms.findRoomById(first.id))?.code).toBe('R1')
    expect(await rooms.updateRoom(id(), { code: 'R9' })).toBeNull()
  })

  it('distributes seats across rooms with interleaved grades', async () => {
    const created = await event()
    const first = await room(created.id, 'R1', 1)
    const second = await room(created.id, 'R2', 1)

    const result = await rooms.autoDistributeSeats({
      eventId: created.id,
      roomIds: [first.id, second.id],
      interleaveByClassroom: true,
      students: [
        { studentId: students.a1, classroomId: classroom7A },
        { studentId: students.a2, classroomId: classroom7A },
        { studentId: students.b1, classroomId: classroom8A },
      ],
    })

    expect(result.assigned).toHaveLength(2)
    expect(result.unassigned.map((row) => row.studentId)).toEqual([students.a2])
    expect(result.assigned.map((row) => row.studentId)).toEqual([
      students.a1,
      students.b1,
    ])
    expect(await rooms.listSeatsByEvent(created.id)).toHaveLength(2)

    const again = await rooms.autoDistributeSeats({
      eventId: created.id,
      roomIds: [first.id, second.id],
      students: [
        { studentId: students.a1, classroomId: classroom7A },
        { studentId: students.b1, classroomId: classroom8A },
      ],
    })
    expect(again.assigned).toEqual([])
    expect(again.unassigned).toHaveLength(2)
    expect(await rooms.listSeatsByEvent(created.id)).toHaveLength(2)
  })

  it('finds the supervisor on duty and swaps them in', async () => {
    const created = await event()
    const first = await room(created.id, 'R1')
    const assigned = await rooms.assignSupervisor({
      roomId: first.id,
      startsAt: new Date('2026-11-02T01:00:00Z'),
      endsAt: new Date('2026-11-02T02:00:00Z'),
      scheduledUserId: supervisorA,
    })

    expect(
      (await rooms.findSupervisorAt(first.id, new Date('2026-11-02T01:30:00Z')))
        ?.actualUserId,
    ).toBe(supervisorA)
    expect(
      await rooms.findSupervisorAt(first.id, new Date('2026-11-02T03:00:00Z')),
    ).toBeNull()

    const swapped = await rooms.substituteSupervisor({
      supervisorId: assigned.id,
      actualUserId: supervisorB,
      substitutedByAdminId: userId,
      reason: 'Pengawas asli sakit',
      at: new Date('2026-11-02T01:10:00Z'),
    })

    expect(swapped?.scheduledUserId).toBe(supervisorA)
    expect(swapped?.actualUserId).toBe(supervisorB)
    expect(
      await rooms.findSupervisorSlotForUser(
        first.id,
        supervisorA,
        new Date('2026-11-02T01:15:00Z'),
      ),
    ).toBeNull()
    expect(
      (
        await rooms.findSupervisorSlotForUser(
          first.id,
          supervisorB,
          new Date('2026-11-02T01:15:00Z'),
        )
      )?.roomId,
    ).toBe(first.id)
  })

  it('stores session events once per client id and the audit trail', async () => {
    const created = await event()
    const first = await room(created.id, 'R1')
    const row = await schedule()
    const sitting = await session(row.id, studentOne)
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

    expect(await rooms.recordSessionEvents(sitting.id, events)).toHaveLength(2)
    expect(await rooms.recordSessionEvents(sitting.id, events)).toHaveLength(2)
    expect(await rooms.listSessionEvents(sitting.id)).toHaveLength(2)

    await rooms.writeAuditLog({
      sessionId: sitting.id,
      roomId: first.id,
      scheduleId: row.id,
      action: 'REOPEN_SESSION',
      actorId: userId,
      reason: 'Salah tekan kumpul',
      metadata: { previousStatus: 'SUBMITTED' },
    })

    const logs = await rooms.listAuditLogs(sitting.id)
    expect(logs).toHaveLength(1)
    expect(logs[0].metadata).toEqual({ previousStatus: 'SUBMITTED' })

    await rooms.writeAuditLog({
      roomId: first.id,
      action: 'ROTATE_ROOM_TOKEN',
      actorId: userId,
      reason: 'Token bocor',
    })
    const byRoom = await rooms.listAuditLogsByRoom(first.id)
    expect(byRoom.map((row) => row.action)).toEqual([
      'REOPEN_SESSION',
      'ROTATE_ROOM_TOKEN',
    ])
    expect(byRoom[1].sessionId).toBeNull()
  })

  it('moves a session through the recovery columns', async () => {
    const created = await event()
    const first = await room(created.id, 'R1')
    const row = await schedule()
    const sitting = await session(row.id, studentOne)

    const seated = await sessions.seatSession(sitting.id, first.id, 3)
    expect(seated?.roomId).toBe(first.id)
    expect(seated?.seatNumber).toBe(3)
    expect(seated?.kioskMode).toBe('PINNED')
    expect(seated?.requiresTokenReentry).toBe(false)
    expect(seated?.lockedByViolation).toBe(false)
    expect(seated?.extraMinutes).toBe(0)

    const locked = await sessions.applyRecovery(sitting.id, {
      lockedByViolation: true,
      requiresTokenReentry: true,
    })
    expect(locked?.lockedByViolation).toBe(true)
    expect(locked?.requiresTokenReentry).toBe(true)

    const reopened = await sessions.applyRecovery(sitting.id, {
      lockedByViolation: false,
      requiresTokenReentry: true,
      extraMinutes: 15,
      allowLateEntry: true,
      kioskMode: 'FLOATING',
      deadline: new Date('2026-11-02T02:45:00Z'),
    })
    expect(reopened?.lockedByViolation).toBe(false)
    expect(reopened?.requiresTokenReentry).toBe(true)
    expect(reopened?.extraMinutes).toBe(15)
    expect(reopened?.allowLateEntry).toBe(true)
    expect(reopened?.kioskMode).toBe('FLOATING')

    const resumed = await sessions.applyRecovery(sitting.id, {
      requiresTokenReentry: false,
    })
    expect(resumed?.requiresTokenReentry).toBe(false)
    expect((await sessions.listByRoom(first.id)).map((s) => s.id)).toEqual([
      sitting.id,
    ])
    expect(await sessions.applyRecovery(id(), { extraMinutes: 5 })).toBeNull()
  })

  async function reportFlow(repo: IExamRoomRepository) {
    const created = await event()
    const first = await room(created.id, 'R1')
    const row = await schedule()
    const slot = await rooms.assignSupervisor({
      roomId: first.id,
      startsAt: new Date('2026-11-02T01:00:00Z'),
      endsAt: new Date('2026-11-02T02:00:00Z'),
      scheduledUserId: supervisorA,
    })
    const report = await repo.createReport({
      roomId: first.id,
      supervisorSlotId: slot.id,
    })
    const drafted = await repo.saveReportDraft(report.id, {
      condition: 'TECHNICAL_ISSUE',
      incidentNotes: 'Proyektor mati',
    })
    const kept = await repo.saveReportDraft(report.id, {
      incidentNotes: undefined,
    })
    const cleared = await repo.saveReportDraft(report.id, {
      incidentNotes: null,
    })
    const absence = await repo.recordAbsence({
      reportId: report.id,
      studentId: studentOne,
      scheduleId: row.id,
      reason: 'SICK',
      note: 'Demam tinggi',
      recordedBy: userId,
    })
    const note = await repo.recordFieldNote({
      reportId: report.id,
      studentId: studentOne,
      sessionId: null,
      category: 'DEVICE',
      note: 'HP restarted',
      recordedBy: userId,
    })
    const earlyVerify = await repo.verifyReport(
      report.id,
      userId,
      new Date('2026-11-02T02:00:00Z'),
    )
    const submitted = await repo.submitReport(
      report.id,
      supervisorA,
      new Date('2026-11-02T02:00:00Z'),
    )
    const resubmitted = await repo.submitReport(
      report.id,
      supervisorA,
      new Date('2026-11-02T02:30:00Z'),
    )
    const lateDraft = await repo.saveReportDraft(report.id, {
      incidentNotes: 'Setelah diserahkan',
    })
    const lateAbsence = await repo.recordAbsence({
      reportId: report.id,
      studentId: studentTwo,
      scheduleId: row.id,
      reason: 'PERMITTED',
      note: 'Izin keluarga',
      recordedBy: userId,
    })
    const lateNote = await repo.recordFieldNote({
      reportId: report.id,
      studentId: studentTwo,
      sessionId: null,
      category: 'DEVICE',
      note: 'Terlambat dicatat',
      recordedBy: userId,
    })
    const verified = await repo.verifyReport(
      report.id,
      userId,
      new Date('2026-11-02T03:00:00Z'),
    )
    const reverified = await repo.verifyReport(
      report.id,
      userId,
      new Date('2026-11-02T03:30:00Z'),
    )
    const found = await repo.findReportBySlot(first.id, slot.id)
    const absences = await repo.listAbsencesByScheduleStudent(
      row.id,
      studentOne,
    )
    return {
      created: report.status,
      drafted: [drafted?.condition, drafted?.incidentNotes],
      kept: [kept?.condition, kept?.incidentNotes],
      cleared: cleared?.incidentNotes,
      earlyVerify,
      resubmitted,
      lateDraft,
      lateAbsence,
      lateNote,
      reverified,
      absence: [absence?.reason, absence?.note, absence?.recordedBy],
      note: [note?.category, note?.note, note?.sessionId],
      submitted: [submitted?.status, submitted?.submittedByUserId !== null],
      verified: [verified?.status, verified?.verifiedByUserId !== null],
      found: [found?.id, found?.status],
      absences: absences.map((entry) => [entry.reason, entry.note]),
      missing: await repo.saveReportDraft(id(), {}),
    }
  }

  it('records a report identically in the fake and the database', async () => {
    const fake = await reportFlow(new FakeExamRoomRepository())
    const real = await reportFlow(rooms)

    expect(real.created).toBe(fake.created)
    expect(real.drafted).toEqual(fake.drafted)
    expect(real.kept).toEqual(fake.kept)
    expect(real.kept).toEqual(['TECHNICAL_ISSUE', 'Proyektor mati'])
    expect(real.cleared).toBeNull()
    expect(fake.cleared).toBeNull()
    expect(real.earlyVerify).toBeNull()
    expect(fake.earlyVerify).toBeNull()
    expect(real.resubmitted).toBeNull()
    expect(fake.resubmitted).toBeNull()
    expect(real.lateDraft).toBeNull()
    expect(fake.lateDraft).toBeNull()
    expect(real.lateAbsence).toBeNull()
    expect(fake.lateAbsence).toBeNull()
    expect(real.lateNote).toBeNull()
    expect(fake.lateNote).toBeNull()
    expect(real.reverified).toBeNull()
    expect(fake.reverified).toBeNull()
    expect(real.absence).toEqual(fake.absence)
    expect(real.note).toEqual(fake.note)
    expect(real.submitted).toEqual(fake.submitted)
    expect(real.verified).toEqual(fake.verified)
    expect(real.found[1]).toBe(fake.found[1])
    expect(real.absences).toEqual(fake.absences)
    expect(real.missing).toBeNull()
    expect(fake.missing).toBeNull()
  })

  it('refuses two reports for the same supervisor slot', async () => {
    const created = await event()
    const first = await room(created.id, 'R1')
    const slot = await rooms.assignSupervisor({
      roomId: first.id,
      startsAt: new Date('2026-11-02T01:00:00Z'),
      endsAt: new Date('2026-11-02T02:00:00Z'),
      scheduledUserId: supervisorA,
    })
    await rooms.createReport({
      roomId: first.id,
      supervisorSlotId: slot.id,
    })

    await expect(
      rooms.createReport({ roomId: first.id, supervisorSlotId: slot.id }),
    ).rejects.toBeInstanceOf(ExamRoomConflictError)
  })
})
