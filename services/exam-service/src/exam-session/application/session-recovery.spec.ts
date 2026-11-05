import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { FakeExamPackageRepository } from '../../exam-package/application/exam-package.repository.fake.js'
import { FakeExamScheduleRepository } from '../../exam-schedule/application/exam-schedule.repository.fake.js'
import { FakeExamRoomRepository } from '../../exam-room/application/exam-room.repository.fake.js'
import {
  MANAGE_ALL,
  RoomAccessService,
  SUPERVISE,
  TECHNICIAN,
  type RoomStaffUser,
} from '../../exam-room/application/room-access.service.js'
import { RoomAccessCodeService } from '../../exam-room/application/room-access-code.service.js'
import { FakeQuestionRepository } from '../../question/application/question.repository.fake.js'
import { AccessCodeService } from '../../exam-schedule/application/access-code.service.js'
import type { ExamSession } from '../domain/entities/exam-session.entity.js'
import { FakeExamSessionRepository } from './exam-session.repository.fake.js'
import { FakeSessionRecoveryRepository } from './session-recovery.repository.fake.js'
import { SeatFlagService } from './seat-flag.service.js'
import { SessionRecoveryService } from './session-recovery.service.js'
import {
  NOW,
  STUDENT_ID,
  STUDENT_USER,
  choiceSpec,
  schedulePaper,
  sessionFor,
} from './exam-session.test-support.js'
import { FakeSessionFinalizer } from './session-finalizer.fake.js'
import { ReopenSessionUseCase } from './use-cases/reopen-session/reopen-session.use-case.js'
import { ResetSessionUseCase } from './use-cases/reset-session/reset-session.use-case.js'
import { ExtendSessionTimeUseCase } from './use-cases/extend-session-time/extend-session-time.use-case.js'
import { AllowWebClientUseCase } from './use-cases/allow-web-client/allow-web-client.use-case.js'
import { AllowLateEntryUseCase } from './use-cases/allow-late-entry/allow-late-entry.use-case.js'
import { ResumeExamSessionUseCase } from './use-cases/resume-exam-session/resume-exam-session.use-case.js'
import { RecordSessionEventsUseCase } from './use-cases/record-session-events/record-session-events.use-case.js'
import { SessionHeartbeatUseCase } from './use-cases/session-heartbeat/session-heartbeat.use-case.js'
import { SessionAccessService } from './session-access.service.js'
import { StartExamSessionUseCase } from './use-cases/start-exam-session/start-exam-session.use-case.js'
import { CreateExamScheduleUseCase } from '../../exam-schedule/application/use-cases/create-exam-schedule/create-exam-schedule.use-case.js'
import { FakeAcademicLookup } from '../../exam-schedule/application/exam-schedule.test-support.js'
import { CLASSROOM_7A } from '../../exam-schedule/application/exam-schedule.test-support.js'
import { FakeExamAccessAttemptRepository } from './exam-access-attempt.repository.fake.js'
import {
  FakeEnrollment,
  FakeStudentIdentity,
} from './exam-session.test-support.js'
import { FinalizeSessionService } from './finalize-session.service.js'
import { SaveAnswerUseCase } from './use-cases/save-answer/save-answer.use-case.js'
import { SaveAnswersBatchUseCase } from './use-cases/save-answers-batch/save-answers-batch.use-case.js'
import { SubmitExamSessionUseCase } from './use-cases/submit-exam-session/submit-exam-session.use-case.js'

const SECRET = 'unit-test-secret-of-at-least-32-characters'
const TECH_A: RoomStaffUser = { id: 'tech-a', permissions: [TECHNICIAN] }
const SUP_A: RoomStaffUser = { id: 'sup-a', permissions: [SUPERVISE] }
const ADMIN: RoomStaffUser = { id: 'admin-1', permissions: [MANAGE_ALL] }

interface Fixtures {
  packages: FakeExamPackageRepository
  schedules: FakeExamScheduleRepository
  questions: FakeQuestionRepository
  rooms: FakeExamRoomRepository
  sessions: FakeExamSessionRepository
  recovery: SessionRecoveryService
  access: RoomAccessService
  schedule: { id: string }
  questionIds: string[]
  roomA: { id: string; eventId: string }
  roomB: { id: string; eventId: string }
}

async function setup(): Promise<Fixtures> {
  const packages = new FakeExamPackageRepository()
  const schedules = new FakeExamScheduleRepository(packages)
  const questions = new FakeQuestionRepository()
  const rooms = new FakeExamRoomRepository()
  const sessions = new FakeExamSessionRepository()
  const access = new RoomAccessService(rooms)
  const recovery = new SessionRecoveryService(
    sessions,
    new FakeSessionRecoveryRepository(sessions, rooms, packages),
    access,
  )
  const { schedule, questionIds } = await schedulePaper(
    { packages, schedules, questions },
    [choiceSpec('B'), choiceSpec('A')],
  )
  const event = await rooms.createEvent({
    semesterId: 'sem-1',
    name: 'UTS Ganjil',
    type: 'UTS',
    startsAt: new Date('2026-11-02T01:00:00.000Z'),
    endsAt: new Date('2026-11-02T04:00:00.000Z'),
    createdById: ADMIN.id,
  })
  const roomA = await rooms.createRoom({
    eventId: event.id,
    code: 'R01',
    name: 'Ruang 01',
    capacity: 30,
    technicianUserId: TECH_A.id,
  })
  const roomB = await rooms.createRoom({
    eventId: event.id,
    code: 'R02',
    name: 'Ruang 02',
    capacity: 30,
    technicianUserId: 'tech-b',
  })
  await rooms.assignSupervisor({
    roomId: roomA.id,
    startsAt: new Date('2026-11-02T01:00:00.000Z'),
    endsAt: new Date('2026-11-02T04:00:00.000Z'),
    scheduledUserId: SUP_A.id,
  })
  return {
    packages,
    schedules,
    questions,
    rooms,
    sessions,
    recovery,
    access,
    schedule,
    questionIds,
    roomA,
    roomB,
  }
}

function seed(
  sessions: FakeExamSessionRepository,
  scheduleId: string,
  overrides: Partial<ExamSession> = {},
): ExamSession {
  const session = sessionFor({ id: scheduleId } as never, {
    id: 'sess-1',
    ...overrides,
  })
  sessions.sessions.set(session.id, session)
  return session
}

function answer(
  sessions: FakeExamSessionRepository,
  sessionId: string,
  questionId: string,
  clientId: string,
): void {
  const id = `${sessionId}-${questionId}`
  sessions.answers.set(id, {
    id,
    sessionId,
    questionId,
    clientId,
    answer: { key: 'B' },
    receivedAfterDeadline: false,
    score: 2,
    gradedById: null,
    gradedAt: null,
    gradeNote: null,
    createdAt: NOW,
    updatedAt: NOW,
  })
}

describe('reopen', () => {
  it('restores a submitted session, keeps every answer and drops the publication', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, {
      status: 'SUBMITTED',
      submittedAt: NOW,
      gradedAt: NOW,
      rawScore: 4,
      maxScore: 4,
      violationCount: 2,
    })
    answer(f.sessions, session.id, f.questionIds[0], 'c-1')
    answer(f.sessions, session.id, f.questionIds[1], 'c-2')
    f.sessions.publications.set(session.id, 'SENT')

    const reopened = await new ReopenSessionUseCase(
      f.recovery,
      f.schedules,
    ).execute(ADMIN, session.id, 'Salah tekan tombol kumpul', NOW)

    expect(reopened).toMatchObject({
      status: 'IN_PROGRESS',
      submittedAt: null,
      gradedAt: null,
      lockedByViolation: false,
      violationCount: 0,
      requiresTokenReentry: true,
      rawScore: null,
      maxScore: null,
    })
    const kept = await f.sessions.listAnswers(session.id)
    expect(kept).toHaveLength(2)
    expect(kept.every((row) => row.score === null)).toBe(true)
    expect(f.sessions.publications.has(session.id)).toBe(false)
    expect(await f.rooms.listAuditLogs(session.id)).toEqual([
      expect.objectContaining({
        action: 'REOPEN_SESSION',
        actorId: ADMIN.id,
        reason: 'Salah tekan tombol kumpul',
      }),
    ])
  })

  it('reopens a GRADED session and keeps a manually graded answer', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, {
      status: 'GRADED',
      submittedAt: NOW,
      gradedAt: NOW,
      rawScore: 7.5,
      maxScore: 2,
    })
    f.sessions.answers.set('manual', {
      id: 'manual',
      sessionId: session.id,
      questionId: f.questionIds[1],
      clientId: 'c-manual',
      answer: { text: 'jawaban esai' },
      receivedAfterDeadline: false,
      score: 7.5,
      gradedById: ADMIN.id,
      gradedAt: NOW,
      gradeNote: null,
      createdAt: NOW,
      updatedAt: NOW,
    })
    f.sessions.publications.set(session.id, 'SENT')

    const reopened = await new ReopenSessionUseCase(
      f.recovery,
      f.schedules,
    ).execute(ADMIN, session.id, 'Salah tekan tombol kumpul', NOW)

    expect(reopened.status).toBe('IN_PROGRESS')
    expect(reopened.gradedAt).toBeNull()
    const manual = f.sessions.answers.get('manual')
    expect(manual?.score).toBe(7.5)
    expect(manual?.gradedById).toBe(ADMIN.id)
    expect(manual?.gradedAt).toEqual(NOW)
    expect(f.sessions.publications.has(session.id)).toBe(false)
  })

  it('reopens a violation-locked session that is still running', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, {
      lockedByViolation: true,
      violationCount: 3,
    })

    const reopened = await new ReopenSessionUseCase(
      f.recovery,
      f.schedules,
    ).execute(ADMIN, session.id, 'Buka blokir pelanggaran', NOW)

    expect(reopened.lockedByViolation).toBe(false)
    expect(reopened.violationCount).toBe(0)
    expect(reopened.status).toBe('IN_PROGRESS')
  })

  it('refuses a running session that is neither closed nor locked', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id)

    await expect(
      new ReopenSessionUseCase(f.recovery, f.schedules).execute(
        ADMIN,
        session.id,
        'Coba buka sesi',
        NOW,
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('refuses once the schedule and extra minutes have both run out', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, { status: 'SUBMITTED' })

    await expect(
      new ReopenSessionUseCase(f.recovery, f.schedules).execute(
        ADMIN,
        session.id,
        'Salah tekan kumpul',
        new Date('2026-11-02T09:00:00.000Z'),
      ),
    ).rejects.toThrow(ConflictException)
  })
})

describe('reset', () => {
  it('wipes the answers and restarts with a new seed', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, {
      status: 'SUBMITTED',
      violationCount: 2,
      extraMinutes: 30,
    })
    answer(f.sessions, session.id, f.questionIds[0], 'c-1')
    const before = f.sessions.sessions.get(session.id)!.shuffleSeed

    const cleared = await new ResetSessionUseCase(
      f.recovery,
      f.schedules,
    ).execute(ADMIN, session.id, 'Ulangi dari awal', NOW)

    expect(cleared.status).toBe('IN_PROGRESS')
    expect(cleared.shuffleSeed).not.toBe(before)
    expect(cleared.startedAt).toEqual(NOW)
    expect(cleared.violationCount).toBe(0)
    expect(cleared.extraMinutes).toBe(0)
    expect(await f.sessions.listAnswers(session.id)).toEqual([])
    expect((await f.rooms.listAuditLogs(session.id))[0]?.action).toBe(
      'RESET_SESSION',
    )
  })
})

describe('extend time', () => {
  it('shifts the deadline and finalizeAt by the requested minutes', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id)
    const deadline = session.deadline.getTime()
    const finalizeAt = session.finalizeAt.getTime()

    const extended = await new ExtendSessionTimeUseCase(f.recovery).execute(
      ADMIN,
      session.id,
      15,
      'Server lambat',
    )

    expect(extended.extraMinutes).toBe(15)
    expect(extended.deadline.getTime()).toBe(deadline + 15 * 60_000)
    expect(extended.finalizeAt.getTime()).toBe(finalizeAt + 15 * 60_000)
  })

  it('caps the cumulative extra minutes at the ceiling', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, { extraMinutes: 150 })

    await expect(
      new ExtendSessionTimeUseCase(f.recovery).execute(
        ADMIN,
        session.id,
        60,
        'Server lambat',
      ),
    ).rejects.toThrow(BadRequestException)
    await expect(
      new ExtendSessionTimeUseCase(f.recovery).execute(
        ADMIN,
        session.id,
        30,
        'Server lambat',
      ),
    ).resolves.toMatchObject({ extraMinutes: 180 })
  })

  it('refuses a finished session and out-of-range minutes', async () => {
    const f = await setup()
    const done = seed(f.sessions, f.schedule.id, { status: 'SUBMITTED' })
    const extend = new ExtendSessionTimeUseCase(f.recovery)

    await expect(
      extend.execute(ADMIN, done.id, 10, 'Server lambat'),
    ).rejects.toThrow(ConflictException)
    await expect(
      extend.execute(ADMIN, done.id, 0, 'Server lambat'),
    ).rejects.toThrow(BadRequestException)
    await expect(
      extend.execute(ADMIN, done.id, 121, 'Server lambat'),
    ).rejects.toThrow(BadRequestException)
  })
})

describe('authorization matrix', () => {
  it('refuses the technician of room A on a session seated in room B', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, {
      status: 'SUBMITTED',
      roomId: f.roomB.id,
    })

    await expect(
      new ReopenSessionUseCase(f.recovery, f.schedules).execute(
        TECH_A,
        session.id,
        'Salah tekan kumpul',
        NOW,
      ),
    ).rejects.toThrow(ForbiddenException)
    await expect(
      new ResetSessionUseCase(f.recovery, f.schedules).execute(
        TECH_A,
        session.id,
        'Ulangi dari awal',
        NOW,
      ),
    ).rejects.toThrow(ForbiddenException)
    await expect(
      new ExtendSessionTimeUseCase(f.recovery).execute(
        TECH_A,
        session.id,
        10,
        'Server lambat',
      ),
    ).rejects.toThrow(ForbiddenException)
    expect(await f.rooms.listAuditLogs(session.id)).toEqual([])
    expect(f.sessions.sessions.get(session.id)?.status).toBe('SUBMITTED')
  })

  it('refuses a supervisor of room A the reopen and reset of room A', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, {
      status: 'SUBMITTED',
      roomId: f.roomA.id,
    })

    await expect(
      new ReopenSessionUseCase(f.recovery, f.schedules).execute(
        SUP_A,
        session.id,
        'Salah tekan kumpul',
        NOW,
      ),
    ).rejects.toThrow(ForbiddenException)
    await expect(
      new ResetSessionUseCase(f.recovery, f.schedules).execute(
        SUP_A,
        session.id,
        'Ulangi dari awal',
        NOW,
      ),
    ).rejects.toThrow(ForbiddenException)
    expect(await f.rooms.listAuditLogs(session.id)).toEqual([])
  })

  it('lets the technician of room A act on their own room', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, {
      status: 'SUBMITTED',
      roomId: f.roomA.id,
    })

    const reopened = await new ReopenSessionUseCase(
      f.recovery,
      f.schedules,
    ).execute(TECH_A, session.id, 'Salah tekan kumpul', NOW)

    expect(reopened.status).toBe('IN_PROGRESS')
  })

  it('refuses an unseated session to anyone without exam-rooms.manage-all', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, { status: 'SUBMITTED' })

    await expect(
      new ReopenSessionUseCase(f.recovery, f.schedules).execute(
        TECH_A,
        session.id,
        'Salah tekan kumpul',
        NOW,
      ),
    ).rejects.toThrow(ForbiddenException)
  })
})

describe('reason validation', () => {
  it('refuses a reason shorter than five characters and leaves the session alone', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, { status: 'SUBMITTED' })
    const reopen = new ReopenSessionUseCase(f.recovery, f.schedules)

    await expect(reopen.execute(ADMIN, session.id, 'hm', NOW)).rejects.toThrow(
      BadRequestException,
    )
    await expect(
      reopen.execute(ADMIN, session.id, '     ', NOW),
    ).rejects.toThrow(BadRequestException)
    expect(await f.rooms.listAuditLogs(session.id)).toEqual([])
    expect(f.sessions.sessions.get(session.id)?.status).toBe('SUBMITTED')
  })
})

describe('audit transaction guarantee', () => {
  it('leaves no audit row when the state change fails', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, { status: 'SUBMITTED' })
    const failing = new FakeSessionRecoveryRepository(
      f.sessions,
      f.rooms,
      f.packages,
    )
    vi.spyOn(failing, 'recoverOne').mockResolvedValue(null)
    const recovery = new SessionRecoveryService(f.sessions, failing, f.access)

    await expect(
      new ReopenSessionUseCase(recovery, f.schedules).execute(
        ADMIN,
        session.id,
        'Salah tekan kumpul',
        NOW,
      ),
    ).rejects.toThrow(ConflictException)
    expect(await f.rooms.listAuditLogs(session.id)).toEqual([])
    expect(f.sessions.sessions.get(session.id)?.status).toBe('SUBMITTED')
  })
})

describe('allow web and allow late', () => {
  async function seatStudent(f: Fixtures): Promise<ExamSession> {
    await f.rooms.assignSeat({
      roomId: f.roomA.id,
      eventId: f.roomA.eventId,
      studentId: STUDENT_USER.id,
      classroomId: 'class-1',
      seatNumber: 1,
    })
    return seed(f.sessions, f.schedule.id, {
      roomId: f.roomA.id,
      seatNumber: 1,
      studentId: STUDENT_USER.id,
    })
  }

  it('flags one student for the web client and audits the room', async () => {
    const f = await setup()
    const session = await seatStudent(f)
    const flags = new SeatFlagService(
      f.sessions,
      f.rooms,
      new FakeSessionRecoveryRepository(f.sessions, f.rooms, f.packages),
      f.access,
    )

    const allowed = await new AllowWebClientUseCase(flags).execute(TECH_A, {
      roomId: f.roomA.id,
      studentId: STUDENT_USER.id,
      reason: 'HP siswa rusak, pakai laptop ruangan',
    })

    expect(allowed.allowWebClient).toBe(true)
    expect(allowed.allowLateEntry).toBe(false)
    expect(f.sessions.sessions.get(session.id)?.allowWebClient).toBe(true)
    expect((await f.rooms.listAuditLogsByRoom(f.roomA.id))[0]).toMatchObject({
      action: 'ALLOW_WEB_CLIENT',
      roomId: f.roomA.id,
    })
  })

  it('flags a late entry and refuses another room technician', async () => {
    const f = await setup()
    await seatStudent(f)
    const flags = new SeatFlagService(
      f.sessions,
      f.rooms,
      new FakeSessionRecoveryRepository(f.sessions, f.rooms, f.packages),
      f.access,
    )
    const allowLate = new AllowLateEntryUseCase(flags)

    const allowed = await allowLate.execute(TECH_A, {
      roomId: f.roomA.id,
      studentId: STUDENT_USER.id,
      reason: 'Terjebak macet di jalan',
    })
    expect(allowed.allowLateEntry).toBe(true)

    await expect(
      allowLate.execute(TECH_A, {
        roomId: f.roomB.id,
        studentId: STUDENT_USER.id,
        reason: 'Terjebak macet di jalan',
      }),
    ).rejects.toThrow(ForbiddenException)
  })
})

describe('allow flags before the session starts', () => {
  async function eventSchedule(f: Fixtures, startsAt: Date) {
    await f.rooms.updateEvent(f.roomA.eventId, { startsAt })
    const pkg = [...f.packages.packages.values()][0]
    const scheduled = await new CreateExamScheduleUseCase(
      f.schedules,
      f.packages,
      new FakeAcademicLookup(),
      f.rooms,
    ).execute(
      { id: ADMIN.id },
      {
        packageId: pkg.id,
        classroomId: CLASSROOM_7A.id,
        startsAt,
        endsAt: new Date('2026-11-02T04:00:00.000Z'),
        durationMinutes: 90,
        type: 'UH',
        eventId: f.roomA.eventId,
      },
      new Date('2026-10-30T00:00:00.000Z'),
    )
    return f.schedules.schedules.get(scheduled.id)!
  }

  async function seatOnly(f: Fixtures) {
    await f.rooms.assignSeat({
      roomId: f.roomA.id,
      eventId: f.roomA.eventId,
      studentId: STUDENT_ID,
      classroomId: 'class-1',
      seatNumber: 1,
    })
  }

  function flagsOf(f: Fixtures) {
    return new SeatFlagService(
      f.sessions,
      f.rooms,
      new FakeSessionRecoveryRepository(f.sessions, f.rooms, f.packages),
      f.access,
    )
  }

  function startUseCase(f: Fixtures) {
    return new StartExamSessionUseCase(
      new FakeStudentIdentity(),
      new FakeEnrollment(),
      f.schedules,
      f.sessions,
      new FakeExamAccessAttemptRepository(),
      new AccessCodeService(SECRET),
      new FakeSessionFinalizer(),
      f.rooms,
    )
  }

  it('grants the web flag to a student who has not started, then lets them start', async () => {
    const f = await setup()
    const row = await eventSchedule(f, new Date('2026-11-02T01:45:00.000Z'))
    await seatOnly(f)

    const allowed = await new AllowWebClientUseCase(flagsOf(f)).execute(
      TECH_A,
      {
        roomId: f.roomA.id,
        studentId: STUDENT_ID,
        reason: 'HP siswa rusak, pakai laptop ruangan',
      },
    )

    expect(allowed).toMatchObject({ allowWebClient: true })
    expect(f.sessions.sessions.size).toBe(0)
    expect((await f.rooms.listAuditLogsByRoom(f.roomA.id))[0]).toMatchObject({
      action: 'ALLOW_WEB_CLIENT',
      sessionId: null,
      roomId: f.roomA.id,
    })

    const started = await startUseCase(f).execute(
      STUDENT_USER,
      row.id,
      {
        accessCode: new AccessCodeService(SECRET).codeFor(
          row.id,
          row.tokenRotation,
          NOW,
        ).code,
        deviceId: 'device-1',
        platform: 'web',
      },
      NOW,
    )

    expect(f.sessions.sessions.get(started.sessionId)?.allowWebClient).toBe(
      true,
    )
  })

  it('grants the late flag to a student who has not started, then lets them start', async () => {
    const f = await setup()
    const row = await eventSchedule(f, new Date('2026-11-02T01:00:00.000Z'))
    await seatOnly(f)

    const allowLate = new AllowLateEntryUseCase(flagsOf(f))
    await expect(
      startUseCase(f).execute(
        STUDENT_USER,
        row.id,
        {
          accessCode: new AccessCodeService(SECRET).codeFor(
            row.id,
            row.tokenRotation,
            NOW,
          ).code,
          deviceId: 'device-1',
        },
        NOW,
      ),
    ).rejects.toMatchObject({ response: { code: 'LATE_ENTRY_FORBIDDEN' } })

    const allowed = await allowLate.execute(TECH_A, {
      roomId: f.roomA.id,
      studentId: STUDENT_ID,
      reason: 'Terjebak macet di jalan',
    })

    expect(allowed).toMatchObject({ allowLateEntry: true })
    await expect(
      startUseCase(f).execute(
        STUDENT_USER,
        row.id,
        {
          accessCode: new AccessCodeService(SECRET).codeFor(
            row.id,
            row.tokenRotation,
            NOW,
          ).code,
          deviceId: 'device-1',
        },
        NOW,
      ),
    ).resolves.toMatchObject({ sessionId: expect.any(String) })
  })
})

describe('session heartbeat', () => {
  function buildBeat(f: Fixtures) {
    const access = new SessionAccessService(
      f.sessions,
      new FakeSessionFinalizer(),
    )
    return new SessionHeartbeatUseCase(access, f.sessions)
  }

  it('refreshes lastSeenAt without touching the violation count', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, { violationCount: 2 })
    const actor = { id: STUDENT_USER.id, deviceId: 'device-1' }

    const beat = await buildBeat(f).execute(actor, session.id, NOW)

    expect(beat.lockedByViolation).toBe(false)
    expect(beat.serverTime).toEqual(NOW)
    const stored = await f.sessions.findById(session.id)
    expect(stored?.violationCount).toBe(2)
    expect(stored?.lastSeenAt).toEqual(NOW)
  })

  it('reports an existing lock without clearing it', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, {
      lockedByViolation: true,
    })

    const beat = await buildBeat(f).execute(
      { id: STUDENT_USER.id, deviceId: 'device-1' },
      session.id,
      NOW,
    )

    expect(beat.lockedByViolation).toBe(true)
  })
})

describe('record session events', () => {
  function build(f: Fixtures) {
    const access = new SessionAccessService(
      f.sessions,
      new FakeSessionFinalizer(),
    )
    return new RecordSessionEventsUseCase(access, f.sessions, f.rooms)
  }

  function event(clientId: string, type: string, isViolation: boolean) {
    return {
      clientId,
      type: type as never,
      isViolation,
      detail: null,
      occurredAt: NOW,
    }
  }

  it('marks a LEFT_APP event as needing a fresh token', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id)
    const actor = { id: STUDENT_USER.id, deviceId: 'device-1' }

    const result = await build(f).execute(
      actor,
      session.id,
      { events: [event('e-1', 'LEFT_APP', false)] },
      NOW,
    )

    expect(result.requiresTokenReentry).toBe(true)
    expect(result.lockedByViolation).toBe(false)
    expect(result.events).toHaveLength(1)
  })

  it('locks the session on the third violation and never double counts a replay', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id)
    const actor = { id: STUDENT_USER.id, deviceId: 'device-1' }
    const useCase = build(f)

    await useCase.execute(
      actor,
      session.id,
      {
        events: [
          event('e-1', 'FOCUS_LOST_BRIEF', true),
          event('e-2', 'SCREEN_OFF', true),
        ],
      },
      NOW,
    )
    const third = await useCase.execute(
      actor,
      session.id,
      { events: [event('e-3', 'OVERLAY_OR_SHADE', true)] },
      NOW,
    )
    expect(third.violationCount).toBe(3)
    expect(third.lockedByViolation).toBe(true)

    const replay = await useCase.execute(
      actor,
      session.id,
      { events: [event('e-3', 'OVERLAY_OR_SHADE', true)] },
      NOW,
    )
    expect(replay.violationCount).toBe(3)
  })

  it('records the absence start from the LEFT_APP event', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id)
    const actor = { id: STUDENT_USER.id, deviceId: 'device-1' }
    const leftAt = new Date(NOW.getTime() - 60_000)

    const result = await build(f).execute(
      actor,
      session.id,
      {
        events: [
          {
            clientId: 'left-1',
            type: 'LEFT_APP',
            isViolation: true,
            detail: null,
            occurredAt: leftAt,
          },
        ],
      },
      NOW,
    )

    expect(result.absentSince).toEqual(leftAt)
    expect(result.lockedByViolation).toBe(false)
  })

  it('blocks the paper, the batch save, the single save and submit while a re-entry is pending', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, {
      requiresTokenReentry: true,
    })
    const actor = { id: STUDENT_USER.id, deviceId: 'device-1' }
    const access = new SessionAccessService(
      f.sessions,
      new FakeSessionFinalizer(),
    )
    const batch = new SaveAnswersBatchUseCase(
      access,
      f.schedules,
      f.packages,
      f.questions,
      f.sessions,
    )
    const single = new SaveAnswerUseCase(
      access,
      f.schedules,
      f.packages,
      f.questions,
      f.sessions,
    )
    const submit = new SubmitExamSessionUseCase(
      access,
      f.schedules,
      f.sessions,
      new FinalizeSessionService(
        f.sessions,
        f.schedules,
        f.packages,
        f.questions,
      ),
      batch,
    )
    const answerBody = {
      questionId: f.questionIds[0],
      clientId: 'c-1',
      answer: { key: 'B' as const },
    }

    await expect(
      access.loadReadable(actor, session.id, NOW),
    ).rejects.toMatchObject({
      status: 403,
      response: { code: 'TOKEN_REENTRY_REQUIRED' },
    })
    await expect(
      batch.execute(actor, session.id, { answers: [answerBody] }, NOW),
    ).rejects.toMatchObject({
      status: 403,
      response: { code: 'TOKEN_REENTRY_REQUIRED' },
    })
    await expect(
      single.execute(actor, session.id, answerBody, NOW),
    ).rejects.toMatchObject({
      status: 403,
      response: { code: 'TOKEN_REENTRY_REQUIRED' },
    })
    await expect(
      submit.execute(actor, session.id, {}, NOW),
    ).rejects.toMatchObject({
      status: 403,
      response: { code: 'TOKEN_REENTRY_REQUIRED' },
    })
    expect(await f.sessions.listAnswers(session.id)).toEqual([])
    expect(f.sessions.sessions.get(session.id)?.status).toBe('IN_PROGRESS')
  })

  it('blocks the paper while the session is locked by violations', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, {
      lockedByViolation: true,
    })
    const access = new SessionAccessService(
      f.sessions,
      new FakeSessionFinalizer(),
    )

    await expect(
      access.loadReadable(
        { id: STUDENT_USER.id, deviceId: 'device-1' },
        session.id,
        NOW,
      ),
    ).rejects.toMatchObject({ status: 403 })
  })
})

describe('resume', () => {
  function build(f: Fixtures) {
    return new ResumeExamSessionUseCase(
      f.sessions,
      f.schedules,
      f.rooms,
      new AccessCodeService(SECRET),
      new RoomAccessCodeService(SECRET),
      new FakeSessionFinalizer(),
    )
  }

  it('clears the re-entry flag with the active room token', async () => {
    const f = await setup()
    const room = f.rooms.rooms.get(f.roomA.id)!
    const session = seed(f.sessions, f.schedule.id, {
      roomId: f.roomA.id,
      requiresTokenReentry: true,
    })
    const code = new RoomAccessCodeService(SECRET).codeFor(
      room.id,
      room.tokenRotation,
      NOW,
    ).code

    const resumed = await build(f).execute(
      { id: STUDENT_USER.id },
      session.id,
      { accessCode: code, deviceId: 'device-1' },
      NOW,
    )

    expect(resumed.session.requiresTokenReentry).toBe(false)
    expect(resumed.serverTime).toEqual(NOW)
  })

  it('locks a session left longer than five minutes when it resumes', async () => {
    const f = await setup()
    const room = f.rooms.rooms.get(f.roomA.id)!
    const leftAt = new Date(NOW.getTime() - 6 * 60_000)
    const session = seed(f.sessions, f.schedule.id, {
      roomId: f.roomA.id,
      requiresTokenReentry: true,
      absentSince: leftAt,
    })
    const code = new RoomAccessCodeService(SECRET).codeFor(
      room.id,
      room.tokenRotation,
      NOW,
    ).code

    await expect(
      build(f).execute(
        { id: STUDENT_USER.id },
        session.id,
        { accessCode: code, deviceId: 'device-1' },
        NOW,
      ),
    ).rejects.toMatchObject({
      response: { code: 'SESSION_LOCKED_BY_ABSENCE' },
    })
  })

  it('clears the absence when the session resumes in time', async () => {
    const f = await setup()
    const room = f.rooms.rooms.get(f.roomA.id)!
    const session = seed(f.sessions, f.schedule.id, {
      roomId: f.roomA.id,
      requiresTokenReentry: true,
      absentSince: new Date(NOW.getTime() - 60_000),
    })
    const code = new RoomAccessCodeService(SECRET).codeFor(
      room.id,
      room.tokenRotation,
      NOW,
    ).code

    const resumed = await build(f).execute(
      { id: STUDENT_USER.id },
      session.id,
      { accessCode: code, deviceId: 'device-1' },
      NOW,
    )

    expect(resumed.session.absentSince).toBeNull()
  })

  it('accepts the previous slot inside the rollover grace', async () => {
    const f = await setup()
    const room = f.rooms.rooms.get(f.roomA.id)!
    const boundary = new Date(Math.floor(NOW.getTime() / 600_000) * 600_000)
    const code = new RoomAccessCodeService(SECRET).codeFor(
      room.id,
      room.tokenRotation,
      new Date(boundary.getTime() - 600_000 + 45_000),
    ).code
    const session = seed(f.sessions, f.schedule.id, {
      roomId: f.roomA.id,
      requiresTokenReentry: true,
    })

    const resumed = await build(f).execute(
      { id: STUDENT_USER.id },
      session.id,
      { accessCode: code, deviceId: 'device-1' },
      new Date(boundary.getTime() + 45_000),
    )

    expect(resumed.session.requiresTokenReentry).toBe(false)
  })

  it('refuses the previous slot once the rollover grace has run out', async () => {
    const f = await setup()
    const room = f.rooms.rooms.get(f.roomA.id)!
    const boundary = new Date(Math.floor(NOW.getTime() / 600_000) * 600_000)
    const code = new RoomAccessCodeService(SECRET).codeFor(
      room.id,
      room.tokenRotation,
      new Date(boundary.getTime() - 600_000 + 45_000),
    ).code
    const session = seed(f.sessions, f.schedule.id, {
      roomId: f.roomA.id,
      requiresTokenReentry: true,
    })

    await expect(
      build(f).execute(
        { id: STUDENT_USER.id },
        session.id,
        { accessCode: code, deviceId: 'device-1' },
        new Date(boundary.getTime() + 120_000),
      ),
    ).rejects.toMatchObject({ status: 403 })
    expect(f.sessions.sessions.get(session.id)?.requiresTokenReentry).toBe(true)
  })

  it('refuses a wrong token and keeps the re-entry flag', async () => {
    const f = await setup()
    const session = seed(f.sessions, f.schedule.id, {
      roomId: f.roomA.id,
      requiresTokenReentry: true,
    })

    await expect(
      build(f).execute(
        { id: STUDENT_USER.id },
        session.id,
        { accessCode: 'ZZZZZZ', deviceId: 'device-1' },
        NOW,
      ),
    ).rejects.toMatchObject({ status: 403 })
    expect(f.sessions.sessions.get(session.id)?.requiresTokenReentry).toBe(true)
  })

  it('refuses a session locked by violations until a technician reopens it', async () => {
    const f = await setup()
    const room = f.rooms.rooms.get(f.roomA.id)!
    const session = seed(f.sessions, f.schedule.id, {
      roomId: f.roomA.id,
      lockedByViolation: true,
    })
    const code = new RoomAccessCodeService(SECRET).codeFor(
      room.id,
      room.tokenRotation,
      NOW,
    ).code

    await expect(
      build(f).execute(
        { id: STUDENT_USER.id },
        session.id,
        { accessCode: code, deviceId: 'device-1' },
        NOW,
      ),
    ).rejects.toMatchObject({ status: 403 })
  })
})

describe('seated sessions in production', () => {
  it('starts a session seated from a schedule created with an exam event, then a technician resumes it with the room token', async () => {
    const f = await setup()
    const pkg = [...f.packages.packages.values()][0]
    const scheduled = await new CreateExamScheduleUseCase(
      f.schedules,
      f.packages,
      new FakeAcademicLookup(),
      f.rooms,
    ).execute(
      { id: ADMIN.id },
      {
        packageId: pkg.id,
        classroomId: CLASSROOM_7A.id,
        startsAt: new Date('2026-11-02T01:00:00.000Z'),
        endsAt: new Date('2026-11-02T04:00:00.000Z'),
        durationMinutes: 90,
        type: 'UH',
        eventId: f.roomA.eventId,
      },
      new Date('2026-10-30T00:00:00.000Z'),
    )
    expect(scheduled.eventId).toBe(f.roomA.eventId)
    const scheduleRow = f.schedules.schedules.get(scheduled.id)!
    await f.rooms.assignSeat({
      roomId: f.roomA.id,
      eventId: f.roomA.eventId,
      studentId: STUDENT_ID,
      classroomId: 'class-1',
      seatNumber: 4,
    })
    await f.rooms.setSeatFlags(f.roomA.eventId, STUDENT_ID, {
      allowLateEntry: true,
    })
    const started = await new StartExamSessionUseCase(
      new FakeStudentIdentity(),
      new FakeEnrollment(),
      f.schedules,
      f.sessions,
      new FakeExamAccessAttemptRepository(),
      new AccessCodeService(SECRET),
      new FakeSessionFinalizer(),
      f.rooms,
    ).execute(
      STUDENT_USER,
      scheduled.id,
      {
        accessCode: new AccessCodeService(SECRET).codeFor(
          scheduled.id,
          scheduleRow.tokenRotation,
          NOW,
        ).code,
        deviceId: 'device-1',
      },
      NOW,
    )
    const stored = f.sessions.sessions.get(started.sessionId)!
    expect(stored).toMatchObject({ roomId: f.roomA.id, seatNumber: 4 })

    await f.rooms.writeAuditLog({
      sessionId: stored.id,
      roomId: f.roomA.id,
      action: 'ALLOW_LATE_ENTRY',
      actorId: TECH_A.id,
      reason: 'Terjebak macet di jalan',
    })
    await f.sessions.applyRecovery(stored.id, {
      status: 'SUBMITTED',
      submittedAt: NOW,
      requiresTokenReentry: true,
    })

    const reopened = await new ReopenSessionUseCase(
      f.recovery,
      f.schedules,
    ).execute(TECH_A, stored.id, 'Salah tekan tombol kumpul', NOW)
    expect(reopened.status).toBe('IN_PROGRESS')

    const room = f.rooms.rooms.get(f.roomA.id)!
    const resumed = await new ResumeExamSessionUseCase(
      f.sessions,
      f.schedules,
      f.rooms,
      new AccessCodeService(SECRET),
      new RoomAccessCodeService(SECRET),
      new FakeSessionFinalizer(),
    ).execute(
      { id: STUDENT_USER.id },
      stored.id,
      {
        accessCode: new RoomAccessCodeService(SECRET).codeFor(
          room.id,
          room.tokenRotation,
          NOW,
        ).code,
        deviceId: 'device-1',
      },
      NOW,
    )

    expect(resumed.session.requiresTokenReentry).toBe(false)
    expect(f.sessions.sessions.get(stored.id)?.status).toBe('IN_PROGRESS')
  })
})

describe('client gates', () => {
  function startUseCase(f: Fixtures) {
    return new StartExamSessionUseCase(
      new FakeStudentIdentity(),
      new FakeEnrollment(),
      f.schedules,
      f.sessions,
      new FakeExamAccessAttemptRepository(),
      new AccessCodeService(SECRET),
      new FakeSessionFinalizer(),
      f.rooms,
    )
  }

  async function eventSchedule(f: Fixtures, startsAt: Date) {
    await f.rooms.updateEvent(f.roomA.eventId, { startsAt })
    const pkg = [...f.packages.packages.values()][0]
    const scheduled = await new CreateExamScheduleUseCase(
      f.schedules,
      f.packages,
      new FakeAcademicLookup(),
      f.rooms,
    ).execute(
      { id: ADMIN.id },
      {
        packageId: pkg.id,
        classroomId: CLASSROOM_7A.id,
        startsAt,
        endsAt: new Date('2026-11-02T04:00:00.000Z'),
        durationMinutes: 90,
        type: 'UH',
        eventId: f.roomA.eventId,
      },
      new Date('2026-10-30T00:00:00.000Z'),
    )
    return f.schedules.schedules.get(scheduled.id)!
  }

  const start = (
    f: Fixtures,
    scheduleId: string,
    rotation: number,
    platform?: 'web' | 'native',
  ) =>
    startUseCase(f).execute(
      STUDENT_USER,
      scheduleId,
      {
        accessCode: new AccessCodeService(SECRET).codeFor(
          scheduleId,
          rotation,
          NOW,
        ).code,
        deviceId: 'device-1',
        platform,
      },
      NOW,
    )

  it('refuses a browser when the event demands the Android app', async () => {
    const f = await setup()
    const row = await eventSchedule(f, new Date('2026-11-02T01:45:00.000Z'))

    await expect(
      start(f, row.id, row.tokenRotation, 'web'),
    ).rejects.toMatchObject({ response: { code: 'WEB_CLIENT_FORBIDDEN' } })
    await expect(
      start(f, row.id, row.tokenRotation, 'native'),
    ).resolves.toMatchObject({ sessionId: expect.any(String) })
  })

  it('lets a browser in once the seat carries allowWebClient', async () => {
    const f = await setup()
    const row = await eventSchedule(f, new Date('2026-11-02T01:45:00.000Z'))
    await f.rooms.assignSeat({
      roomId: f.roomA.id,
      eventId: f.roomA.eventId,
      studentId: STUDENT_ID,
      classroomId: 'class-1',
      seatNumber: 1,
    })
    await f.rooms.setSeatFlags(f.roomA.eventId, STUDENT_ID, {
      allowWebClient: true,
    })

    await expect(
      start(f, row.id, row.tokenRotation, 'web'),
    ).resolves.toMatchObject({ sessionId: expect.any(String) })
  })

  it('holds a late student until allowLateEntry is set', async () => {
    const f = await setup()
    const row = await eventSchedule(f, new Date('2026-11-02T01:00:00.000Z'))

    await expect(start(f, row.id, row.tokenRotation)).rejects.toMatchObject({
      response: { code: 'LATE_ENTRY_FORBIDDEN' },
    })

    await f.rooms.assignSeat({
      roomId: f.roomA.id,
      eventId: f.roomA.eventId,
      studentId: STUDENT_ID,
      classroomId: 'class-1',
      seatNumber: 2,
    })
    await f.rooms.setSeatFlags(f.roomA.eventId, STUDENT_ID, {
      allowLateEntry: true,
    })

    await expect(start(f, row.id, row.tokenRotation)).resolves.toMatchObject({
      sessionId: expect.any(String),
    })
  })

  it('refuses a browser on resume too', async () => {
    const f = await setup()
    const row = await eventSchedule(f, new Date('2026-11-02T01:45:00.000Z'))
    const session = seed(f.sessions, row.id, {
      roomId: f.roomA.id,
      requiresTokenReentry: true,
    })
    const room = f.rooms.rooms.get(f.roomA.id)!
    const useCase = new ResumeExamSessionUseCase(
      f.sessions,
      f.schedules,
      f.rooms,
      new AccessCodeService(SECRET),
      new RoomAccessCodeService(SECRET),
      new FakeSessionFinalizer(),
    )

    await expect(
      useCase.execute(
        { id: STUDENT_USER.id },
        session.id,
        {
          accessCode: new RoomAccessCodeService(SECRET).codeFor(
            room.id,
            room.tokenRotation,
            NOW,
          ).code,
          deviceId: 'device-1',
          platform: 'web',
        },
        NOW,
      ),
    ).rejects.toMatchObject({ response: { code: 'WEB_CLIENT_FORBIDDEN' } })
  })
})

describe('allow flags without a session stay atomic', () => {
  it('writes the seat flag and its audit row in one call', async () => {
    const f = await setup()
    await f.rooms.assignSeat({
      roomId: f.roomA.id,
      eventId: f.roomA.eventId,
      studentId: STUDENT_ID,
      classroomId: 'class-1',
      seatNumber: 3,
    })
    const flags = new SeatFlagService(
      f.sessions,
      f.rooms,
      new FakeSessionRecoveryRepository(f.sessions, f.rooms, f.packages),
      f.access,
    )
    const seen: string[] = []
    const original = f.rooms.setSeatFlagsWithAudit.bind(f.rooms)
    f.rooms.setSeatFlagsWithAudit = (eventId, studentId, patch, audit) => {
      seen.push(audit.action)
      return original(eventId, studentId, patch, audit)
    }

    await new AllowWebClientUseCase(flags).execute(TECH_A, {
      roomId: f.roomA.id,
      studentId: STUDENT_ID,
      reason: 'HP siswa rusak, pakai laptop ruangan',
    })

    expect(seen).toEqual(['ALLOW_WEB_CLIENT'])
    expect(await f.rooms.listAuditLogsByRoom(f.roomA.id)).toHaveLength(1)
    const seat = await f.rooms.findSeat(f.roomA.eventId, STUDENT_ID)
    expect(seat?.allowWebClient).toBe(true)
  })
})
