import { createHash } from 'node:crypto'
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common'
import { FakeExamActivityRepository } from '../../../../exam-activity/application/exam-activity.repository.fake.js'
import type { ExamActivity } from '../../../../exam-activity/domain/entities/exam-activity.entity.js'
import { FakeExamPackageRepository } from '../../../../exam-package/application/exam-package.repository.fake.js'
import { AccessCodeService } from '../../../../exam-schedule/application/access-code.service.js'
import { FakeExamScheduleRepository } from '../../../../exam-schedule/application/exam-schedule.repository.fake.js'
import type { ExamSchedule } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import {
  CLASSROOM_7A,
  USER,
} from '../../../../exam-schedule/application/exam-schedule.test-support.js'
import { FakeQuestionRepository } from '../../../../question/application/question.repository.fake.js'
import { FakeExamAccessAttemptRepository } from '../../exam-access-attempt.repository.fake.js'
import { FakeExamSessionRepository } from '../../exam-session.repository.fake.js'
import {
  ENDS,
  FakeEnrollment,
  FakeParticipantNumber,
  FakeStudentIdentity,
  NOW,
  STARTS,
  STUDENT_ID,
  STUDENT_USER,
  activityFor,
  scheduleExam,
  sessionFor,
} from '../../exam-session.test-support.js'
import { FinalizeSessionService } from '../../finalize-session.service.js'
import { LifecycleGate } from '../../lifecycle-gate.service.js'
import { StartExamSessionUseCase } from './start-exam-session.use-case.js'
import { FakeExamRoomRepository } from '../../../../exam-room/application/exam-room.repository.fake.js'
import { FakeSebConfigRepository } from '../../../../seb/application/seb-config.repository.fake.js'
import { SebVerifier } from '../../../../seb/application/seb-verifier.service.js'
import type { SebConfig } from '../../../../seb/domain/entities/seb-config.entity.js'

const SEB_PAGE = 'https://exam.example/my-exams/s1/token'
const SEB_KEY = 'a'.repeat(64)
const sebHash = (url: string, key: string) =>
  createHash('sha256')
    .update(url + key)
    .digest('hex')
const sebConfig: SebConfig = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ujian Sekolah',
  configKey: SEB_KEY,
  storageKey: 'seb-configs/seb.seb',
  active: true,
  createdById: USER.id,
  createdAt: NOW,
  updatedAt: NOW,
}

const codes = new AccessCodeService(
  'unit-test-secret-of-at-least-32-characters',
)

describe('StartExamSessionUseCase', () => {
  let packages: FakeExamPackageRepository
  let schedules: FakeExamScheduleRepository
  let questions: FakeQuestionRepository
  let sessions: FakeExamSessionRepository
  let attempts: FakeExamAccessAttemptRepository
  let rooms: FakeExamRoomRepository
  let activities: FakeExamActivityRepository
  let sebConfigs: FakeSebConfigRepository
  let schedule: ExamSchedule

  beforeEach(async () => {
    packages = new FakeExamPackageRepository()
    schedules = new FakeExamScheduleRepository(packages)
    questions = new FakeQuestionRepository()
    sessions = new FakeExamSessionRepository()
    attempts = new FakeExamAccessAttemptRepository()
    rooms = new FakeExamRoomRepository()
    activities = new FakeExamActivityRepository()
    sebConfigs = new FakeSebConfigRepository()
    sebConfigs.configs.set(sebConfig.id, sebConfig)
    schedule = await scheduleExam({ packages, schedules, questions })
  })

  const build = (
    students = new FakeStudentIdentity(),
    enrollments = new FakeEnrollment(),
    participants = new FakeParticipantNumber(),
  ) =>
    new StartExamSessionUseCase(
      students,
      enrollments,
      schedules,
      sessions,
      attempts,
      codes,
      new FinalizeSessionService(sessions, schedules, packages, questions),
      rooms,
      participants,
      new LifecycleGate(schedules, activities),
      new SebVerifier(sebConfigs, ['https://exam.example']),
    )

  const start = (
    useCase: StartExamSessionUseCase,
    overrides: {
      code?: string
      device?: string
      now?: Date
      platform?: 'web' | 'native'
      seb?: { configKeyHash: string; pageUrl: string }
    } = {},
  ) =>
    useCase.execute(
      STUDENT_USER,
      schedule.id,
      {
        accessCode:
          overrides.code ??
          codes.codeFor(
            schedule.id,
            schedule.tokenRotation,
            overrides.now ?? NOW,
          ).code,
        deviceId: overrides.device ?? 'device-1',
        platform: overrides.platform,
        seb: overrides.seb,
      },
      overrides.now ?? NOW,
    )

  const attach = async (overrides: Partial<ExamActivity> = {}) => {
    const activity = await activityFor(activities, schedule, overrides)
    schedules.schedules.set(schedule.id, {
      ...schedule,
      activityId: activity.id,
    })
    return activity
  }

  describe('the Safe Exam Browser client', () => {
    const verified = {
      configKeyHash: sebHash(SEB_PAGE, SEB_KEY),
      pageUrl: SEB_PAGE,
    }

    it('refuses a web start without a proof and counts no failure', async () => {
      const useCase = build()

      await expect(
        start(useCase, { platform: 'web', code: 'WRONG' }),
      ).rejects.toMatchObject({
        response: {
          code: 'SEB_REQUIRED',
          message:
            'Buka ujian lewat Safe Exam Browser dengan konfigurasi sekolah.',
        },
      })
      const state = await attempts.get(schedule.id, STUDENT_ID)
      expect(state.failures).toBe(0)
    })

    it('starts a verified web session as SEB', async () => {
      const started = await start(build(), {
        platform: 'web',
        seb: verified,
      })

      expect(await sessions.findById(started.sessionId)).toMatchObject({
        client: 'SEB',
      })
    })

    it('starts a native session as ISTIQRA', async () => {
      const started = await start(build(), { platform: 'native' })

      expect(await sessions.findById(started.sessionId)).toMatchObject({
        client: 'ISTIQRA',
      })
    })

    it('switches a session started on Istiqra to SEB when started again in SEB', async () => {
      const first = await start(build(), { platform: 'native' })

      const again = await start(build(), {
        platform: 'web',
        seb: verified,
      })

      expect(again.sessionId).toBe(first.sessionId)
      expect(await sessions.findById(first.sessionId)).toMatchObject({
        client: 'SEB',
      })
    })
  })

  it('starts a session whose deadline follows the duration', async () => {
    const started = await start(build())

    expect(started.deadline).toEqual(new Date('2026-11-02T03:30:00.000Z'))
    expect(started.serverTime).toEqual(NOW)
    const stored = await sessions.findById(started.sessionId)
    expect(stored).toMatchObject({
      studentId: STUDENT_ID,
      userId: STUDENT_USER.id,
      deviceId: 'device-1',
      enrollmentId: 'enr-1',
      status: 'IN_PROGRESS',
      finalizeAt: new Date('2026-11-02T03:40:00.000Z'),
    })
    expect(stored?.shuffleSeed).toMatch(/^[0-9a-f]{32}$/)
  })

  it('seats the session from the room seat of the event', async () => {
    const event = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Ganjil',
      type: 'MIDTERM',
      startsAt: new Date('2026-11-02T01:45:00.000Z'),
      endsAt: ENDS,
      createdById: 'admin-1',
    })
    const room = await rooms.createRoom({
      eventId: event.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 30,
    })
    await rooms.assignSeat({
      roomId: room.id,
      eventId: event.id,
      studentId: STUDENT_ID,
      classroomId: 'class-1',
      seatNumber: 12,
    })
    schedules.schedules.set(schedule.id, { ...schedule, eventId: event.id })

    const started = await start(build())
    const stored = await sessions.findById(started.sessionId)

    expect(stored).toMatchObject({ roomId: room.id, seatNumber: 12 })
  })

  it('leaves the room empty when the student has no seat', async () => {
    const started = await start(build())
    const stored = await sessions.findById(started.sessionId)

    expect(stored?.roomId).toBeNull()
    expect(stored?.seatNumber).toBeNull()
  })

  it('cuts the deadline at the end of the window for a late start', async () => {
    const started = await start(build(), {
      now: new Date('2026-11-02T03:30:00.000Z'),
    })

    expect(started.deadline).toEqual(ENDS)
  })

  it('gives each student a seed of their own', async () => {
    const first = await start(build())
    const other = await build(
      new FakeStudentIdentity({ studentId: 'other' }),
    ).execute(
      { id: 'other-user' },
      schedule.id,
      {
        accessCode: codes.codeFor(schedule.id, 0, NOW).code,
        deviceId: 'device-2',
      },
      NOW,
    )

    expect((await sessions.findById(first.sessionId))?.shuffleSeed).not.toBe(
      (await sessions.findById(other.sessionId))?.shuffleSeed,
    )
  })

  it('returns the same session to the same device', async () => {
    const first = await start(build())
    const again = await start(build())

    expect(again.sessionId).toBe(first.sessionId)
    expect(again.deadline).toEqual(first.deadline)
    expect(sessions.sessions.size).toBe(1)
  })

  it('still wants the access code to resume', async () => {
    await start(build())

    await expect(start(build(), { code: 'AAAAAA' })).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('refuses another device with 409 while the session is bound', async () => {
    await start(build())

    await expect(start(build(), { device: 'device-2' })).rejects.toThrow(
      'Sesi aktif di perangkat lain. Minta pengawas melepas sesi',
    )
    await expect(start(build(), { device: 'device-2' })).rejects.toThrow(
      ConflictException,
    )
  })

  it('binds a released session to the new device and keeps seed and deadline', async () => {
    const first = await start(build())
    const before = await sessions.findById(first.sessionId)
    sessions.sessions.set(first.sessionId, { ...before!, deviceId: null })

    const resumed = await start(build(), { device: 'device-2' })

    const after = await sessions.findById(first.sessionId)
    expect(resumed.sessionId).toBe(first.sessionId)
    expect(after?.deviceId).toBe('device-2')
    expect(after?.shuffleSeed).toBe(before?.shuffleSeed)
    expect(after?.deadline).toEqual(before?.deadline)
  })

  it('refuses a session that was already handed in', async () => {
    sessions.sessions.set(
      'done',
      sessionFor(schedule, {
        id: 'done',
        status: 'SUBMITTED',
        submittedAt: NOW,
      }),
    )

    await expect(start(build())).rejects.toThrow('Ujian sudah dikumpulkan')
  })

  it('creates one session for two simultaneous starts from the same device', async () => {
    const [a, b] = await Promise.all([start(build()), start(build())])

    expect(a.sessionId).toBe(b.sessionId)
    expect(sessions.sessions.size).toBe(1)
  })

  it('lets only one of two simultaneous starts from different devices in', async () => {
    const results = await Promise.allSettled([
      start(build(), { device: 'device-1' }),
      start(build(), { device: 'device-2' }),
    ])

    expect(results.filter((row) => row.status === 'fulfilled')).toHaveLength(1)
    expect(sessions.sessions.size).toBe(1)
  })

  it('refuses a student of another classroom', async () => {
    const other = new FakeEnrollment({
      enrollment: {
        id: 'e',
        studentId: STUDENT_ID,
        classroomId: 'room-8a',
        semesterId: schedule.semesterId,
      },
    })

    await expect(start(build(undefined, other))).rejects.toThrow(
      'Ujian ini bukan untuk kelas Anda',
    )
  })

  it('refuses an account that is not a student and a student without enrollment', async () => {
    await expect(
      start(build(new FakeStudentIdentity({ studentId: null }))),
    ).rejects.toThrow(ForbiddenException)
    await expect(
      start(build(undefined, new FakeEnrollment({ enrollment: null }))),
    ).rejects.toThrow(ForbiddenException)
  })

  it('answers 404 for a schedule that does not exist', async () => {
    await expect(
      build().execute(
        STUDENT_USER,
        'missing',
        { accessCode: 'AAAAAA', deviceId: 'd' },
        NOW,
      ),
    ).rejects.toThrow(NotFoundException)
  })

  it('refuses before the window opens and from the moment it closes', async () => {
    await expect(
      start(build(), { now: new Date(STARTS.getTime() - 1000) }),
    ).rejects.toThrow('Ujian belum dibuka')
    await expect(start(build(), { now: ENDS })).rejects.toThrow(
      'Waktu ujian sudah berakhir',
    )
  })

  describe('the activity lifecycle', () => {
    it('refuses to start before the activity window opens', async () => {
      await attach({
        startsAt: new Date('2026-11-02T03:00:00.000Z'),
        endsAt: new Date('2026-11-02T06:00:00.000Z'),
      })

      const error = await start(build()).catch((thrown: unknown) => thrown)

      expect(error).toBeInstanceOf(ConflictException)
      expect(error).toMatchObject({ code: 'WINDOW_CLOSED' })
      expect(sessions.sessions.size).toBe(0)
    })

    it('refuses to start once the activity is closed', async () => {
      await attach({ status: 'CLOSED' })

      const error = await start(build()).catch((thrown: unknown) => thrown)

      expect(error).toBeInstanceOf(ConflictException)
      expect(error).toMatchObject({ code: 'WINDOW_CLOSED' })
      expect(sessions.sessions.size).toBe(0)
    })

    it('lets the student start inside the activity window', async () => {
      const activity = await attach()

      const started = await build().execute(
        STUDENT_USER,
        schedule.id,
        {
          accessCode: codes.codeFor(`activity:${activity.id}`, 0, NOW).code,
          deviceId: 'device-1',
        },
        NOW,
      )

      expect((await sessions.findById(started.sessionId))?.status).toBe(
        'IN_PROGRESS',
      )
    })

    it('names the room and the participant number when it refuses', async () => {
      const event = await rooms.createEvent({
        semesterId: schedule.semesterId,
        name: 'UTS Ganjil',
        type: 'MIDTERM',
        startsAt: STARTS,
        endsAt: ENDS,
        createdById: USER.id,
      })
      const room = await rooms.createRoom({
        eventId: event.id,
        code: 'R01',
        name: 'Ruang 01',
        capacity: 30,
      })
      await rooms.assignSeat({
        roomId: room.id,
        eventId: event.id,
        studentId: STUDENT_ID,
        classroomId: CLASSROOM_7A.id,
        seatNumber: 12,
      })
      await attach({ status: 'CLOSED', eventId: event.id })

      await expect(
        start(
          build(
            undefined,
            undefined,
            new FakeParticipantNumber({ number: '2024001' }),
          ),
        ),
      ).rejects.toThrow(
        'Waktu ujian sudah berakhir di Ruang 01, nomor peserta 2024001',
      )
    })

    it('says the window has not opened while the activity is not active yet', async () => {
      await attach({
        status: 'SCHEDULED',
        startsAt: new Date('2026-11-02T03:00:00.000Z'),
        endsAt: new Date('2026-11-02T06:00:00.000Z'),
      })

      await expect(start(build())).rejects.toThrow('Ujian belum dibuka')
    })
  })

  it('refuses a cancelled schedule', async () => {
    schedules.schedules.set(schedule.id, { ...schedule, status: 'CANCELLED' })

    await expect(start(build())).rejects.toThrow(
      'Jadwal ujian sudah dibatalkan',
    )
  })

  it('still accepts the code of the slot that ended just now', async () => {
    const previous = codes.codeFor(
      schedule.id,
      schedule.tokenRotation,
      new Date(NOW.getTime() - 600_000 + 45_000),
    ).code

    const started = await start(build(), { code: previous })

    expect((await sessions.findById(started.sessionId))?.status).toBe(
      'IN_PROGRESS',
    )
  })

  it('refuses the previous slot once the rollover grace has run out', async () => {
    const previous = codes.codeFor(
      schedule.id,
      schedule.tokenRotation,
      new Date(NOW.getTime() - 600_000 + 45_000),
    ).code

    await expect(
      start(build(), {
        code: previous,
        now: new Date(NOW.getTime() + 120_000),
      }),
    ).rejects.toThrow(ForbiddenException)
    expect(sessions.sessions.size).toBe(0)
  })

  it('refuses a wrong code and the code from before a rotation', async () => {
    const old = codes.codeFor(schedule.id, 0, NOW).code
    schedules.schedules.set(schedule.id, { ...schedule, tokenRotation: 1 })

    await expect(start(build(), { code: 'AAAAAA' })).rejects.toThrow(
      'Token ujian salah',
    )
    await expect(start(build(), { code: old })).rejects.toThrow(
      'Token ujian salah',
    )
    expect(sessions.sessions.size).toBe(0)
  })

  it('locks after five wrong codes, even for the right code, and unlocks later', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(start(build(), { code: 'AAAAAA' })).rejects.toThrow(
        'Token ujian salah',
      )
    }

    const locked = await start(build()).catch((error: unknown) => error)
    expect(locked).toBeInstanceOf(HttpException)
    expect((locked as HttpException).getStatus()).toBe(429)

    const later = await start(build(), {
      now: new Date(NOW.getTime() + 6 * 60_000),
    })
    expect(later.sessionId).toBeDefined()
  })

  it('clears the failures after a correct code', async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      await expect(start(build(), { code: 'AAAAAA' })).rejects.toThrow(
        'Token ujian salah',
      )
    }
    await start(build())

    expect(await attempts.get(schedule.id, STUDENT_ID)).toEqual({
      failures: 0,
      lockedUntil: null,
    })
  })

  it('closes a session whose sending time passed instead of resuming it', async () => {
    sessions.sessions.set(
      'late',
      sessionFor(schedule, {
        id: 'late',
        deadline: new Date('2026-11-02T01:40:00.000Z'),
        finalizeAt: new Date('2026-11-02T01:50:00.000Z'),
      }),
    )

    await expect(start(build())).rejects.toThrow('Ujian sudah dikumpulkan')
    expect(sessions.sessions.get('late')?.status).not.toBe('IN_PROGRESS')
  })

  describe('makeups', () => {
    const MAKEUP_NOW = new Date('2026-11-05T02:00:00.000Z')

    async function withMakeup(participants: string[] = [STUDENT_ID]) {
      const makeup = await schedules.createMakeup({
        packageId: schedule.packageId,
        classroomId: schedule.classroomId,
        semesterId: schedule.semesterId,
        startsAt: new Date('2026-11-05T01:00:00.000Z'),
        endsAt: new Date('2026-11-05T04:00:00.000Z'),
        durationMinutes: 90,
        type: schedule.type,
        createdById: schedule.createdById,
        makeupOfId: schedule.id,
        participants: participants.map((studentId) => ({
          studentId,
          reason: 'SICK' as const,
          note: null,
        })),
      })
      if (makeup === null) throw new Error('makeup not created')
      return makeup
    }

    const startMakeup = (
      makeup: ExamSchedule,
      enrollments = new FakeEnrollment(),
      participants = new FakeParticipantNumber(),
    ) =>
      build(new FakeStudentIdentity(), enrollments, participants).execute(
        STUDENT_USER,
        makeup.id,
        {
          accessCode: codes.codeFor(makeup.id, makeup.tokenRotation, MAKEUP_NOW)
            .code,
          deviceId: 'device-1',
        },
        MAKEUP_NOW,
      )

    it('lets a participant start with the token of the makeup', async () => {
      const makeup = await withMakeup()

      const started = await startMakeup(makeup)

      expect((await sessions.findById(started.sessionId))?.scheduleId).toBe(
        makeup.id,
      )
    })

    it('seats the makeup from the room and seat of the parent event', async () => {
      const event = await rooms.createEvent({
        semesterId: schedule.semesterId,
        name: 'UTS Ganjil',
        type: 'MIDTERM',
        startsAt: MAKEUP_NOW,
        endsAt: new Date('2026-11-05T04:00:00.000Z'),
        createdById: USER.id,
      })
      const room = await rooms.createRoom({
        eventId: event.id,
        code: 'R01',
        name: 'Ruang 01',
        capacity: 30,
      })
      await rooms.assignSeat({
        roomId: room.id,
        eventId: event.id,
        studentId: STUDENT_ID,
        classroomId: CLASSROOM_7A.id,
        seatNumber: 12,
      })
      schedules.schedules.set(schedule.id, { ...schedule, eventId: event.id })
      const makeup = await withMakeup()

      const started = await startMakeup(makeup)

      expect(await sessions.findById(started.sessionId)).toMatchObject({
        roomId: room.id,
        seatNumber: 12,
      })
    })

    it('requires Safe Exam Browser for a makeup too', async () => {
      const makeup = await withMakeup()

      await expect(
        build().execute(
          STUDENT_USER,
          makeup.id,
          {
            accessCode: codes.codeFor(
              makeup.id,
              makeup.tokenRotation,
              MAKEUP_NOW,
            ).code,
            deviceId: 'device-1',
            platform: 'web',
          },
          MAKEUP_NOW,
        ),
      ).rejects.toMatchObject({ response: { code: 'SEB_REQUIRED' } })
    })

    it('keeps the makeup on its own window, not the window of the activity', async () => {
      const makeup = await withMakeup()
      await attach({
        startsAt: new Date(MAKEUP_NOW.getTime() + 60 * 60_000),
        endsAt: new Date(MAKEUP_NOW.getTime() + 2 * 60 * 60_000),
      })

      await expect(startMakeup(makeup)).resolves.toBeDefined()
    })

    it('refuses the makeup when the activity is closed', async () => {
      const makeup = await withMakeup()
      await attach({ status: 'CLOSED' })

      const error = await startMakeup(makeup).catch((thrown: unknown) => thrown)

      expect(error).toBeInstanceOf(ConflictException)
      expect(error).toMatchObject({ code: 'WINDOW_CLOSED' })
    })

    it('names the room of the activity event when it refuses the makeup', async () => {
      const makeup = await withMakeup()
      const event = await rooms.createEvent({
        semesterId: schedule.semesterId,
        name: 'UTS Ganjil',
        type: 'MIDTERM',
        startsAt: new Date('2026-11-05T01:00:00.000Z'),
        endsAt: new Date('2026-11-05T04:00:00.000Z'),
        createdById: USER.id,
      })
      const room = await rooms.createRoom({
        eventId: event.id,
        code: 'R01',
        name: 'Ruang 01',
        capacity: 30,
      })
      await rooms.assignSeat({
        roomId: room.id,
        eventId: event.id,
        studentId: STUDENT_ID,
        classroomId: CLASSROOM_7A.id,
        seatNumber: 9,
      })
      await attach({ status: 'CLOSED', eventId: event.id })

      await expect(
        startMakeup(
          makeup,
          undefined,
          new FakeParticipantNumber({ number: '2024001' }),
        ),
      ).rejects.toThrow(
        'Waktu ujian sudah berakhir di Ruang 01, nomor peserta 2024001',
      )
    })

    it('does not accept the token of the regular exam', async () => {
      const makeup = await withMakeup()

      await expect(
        build().execute(
          STUDENT_USER,
          makeup.id,
          {
            accessCode: codes.codeFor(
              schedule.id,
              schedule.tokenRotation,
              MAKEUP_NOW,
            ).code,
            deviceId: 'device-1',
          },
          MAKEUP_NOW,
        ),
      ).rejects.toThrow('Token ujian salah')
    })

    it('refuses a student who is not a participant', async () => {
      const makeup = await withMakeup(['someone-else'])

      await expect(startMakeup(makeup)).rejects.toThrow(
        'Anda tidak terdaftar di ujian susulan ini',
      )
    })

    it('refuses a student who already sat the regular exam', async () => {
      const makeup = await withMakeup()
      sessions.sessions.set(
        'r',
        sessionFor(schedule, {
          id: 'r',
          status: 'SUBMITTED',
          submittedAt: NOW,
        }),
      )

      await expect(startMakeup(makeup)).rejects.toThrow(
        'Anda sudah mengikuti ujian ini',
      )
    })

    it('lets a participant who moved to another classroom start', async () => {
      const makeup = await withMakeup()
      const moved = new FakeEnrollment({
        enrollment: {
          id: 'enr-2',
          studentId: STUDENT_ID,
          classroomId: 'other-room',
          semesterId: makeup.semesterId,
        },
      })

      await expect(startMakeup(makeup, moved)).resolves.toBeDefined()
    })

    it('refuses a student who already sat an earlier makeup of the same exam', async () => {
      const earlier = await schedules.createMakeup({
        packageId: schedule.packageId,
        classroomId: schedule.classroomId,
        semesterId: schedule.semesterId,
        startsAt: new Date('2026-11-03T01:00:00.000Z'),
        endsAt: new Date('2026-11-03T04:00:00.000Z'),
        durationMinutes: 90,
        type: schedule.type,
        createdById: schedule.createdById,
        makeupOfId: schedule.id,
        participants: [
          { studentId: STUDENT_ID, reason: 'SICK' as const, note: null },
        ],
      })
      sessions.sessions.set(
        'e',
        sessionFor(earlier!, {
          id: 'e',
          status: 'GRADED',
          submittedAt: NOW,
        }),
      )
      const makeup = await withMakeup()

      await expect(startMakeup(makeup)).rejects.toThrow(
        'Anda sudah mengikuti ujian ini',
      )
    })

    it('lets a student whose regular session was closed by the clock with no answers sit the makeup', async () => {
      const makeup = await withMakeup()
      sessions.sessions.set(
        'g',
        sessionFor(schedule, { id: 'g', status: 'GRADED' }),
      )

      await expect(startMakeup(makeup)).resolves.toBeDefined()
    })

    it('refuses a makeup whose regular exam was cancelled', async () => {
      const makeup = await withMakeup()
      await schedules.cancel(schedule.id)

      await expect(startMakeup(makeup)).rejects.toThrow(
        'Ujian utama sudah dibatalkan',
      )
    })

    it('refuses to start the regular exam once the student has a session on a makeup of it', async () => {
      const makeup = await withMakeup()
      sessions.sessions.set(
        'm',
        sessionFor(makeup, { id: 'm', status: 'IN_PROGRESS' }),
      )

      await expect(start(build())).rejects.toThrow(
        'Anda sudah mengikuti ujian ini',
      )
    })

    it('refuses a cancelled makeup', async () => {
      const makeup = await withMakeup()
      await schedules.cancel(makeup.id)

      await expect(startMakeup(makeup)).rejects.toThrow(ForbiddenException)
    })
  })
})
