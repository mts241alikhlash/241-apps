import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { FakeExamPackageRepository } from '../../../../exam-package/application/exam-package.repository.fake.js'
import { FakeExamScheduleRepository } from '../../../../exam-schedule/application/exam-schedule.repository.fake.js'
import { FakeQuestionRepository } from '../../../../question/application/question.repository.fake.js'
import { FakeExamAccessAttemptRepository } from '../../exam-access-attempt.repository.fake.js'
import { FakeExamSessionRepository } from '../../exam-session.repository.fake.js'
import { AccessCodeService } from '../../../../exam-schedule/application/access-code.service.js'
import {
  FakeEnrollment,
  FakeStudentDirectory,
  FakeStudentIdentity,
  NOW,
  STUDENT_USER,
  choiceSpec,
  schedulePaper,
  sessionFor,
} from '../../exam-session.test-support.js'
import { FakeSessionFinalizer } from '../../session-finalizer.fake.js'
import { StartExamSessionUseCase } from '../start-exam-session/start-exam-session.use-case.js'
import { ListScheduleSessionsUseCase } from '../list-schedule-sessions/list-schedule-sessions.use-case.js'
import { ReleaseSessionUseCase } from './release-session.use-case.js'
import { FakeExamRoomRepository } from '../../../../exam-room/application/exam-room.repository.fake.js'
import { FakeSessionRecoveryRepository } from '../../session-recovery.repository.fake.js'
import {
  MANAGE_ALL,
  RoomAccessService,
  SUPERVISE,
  TECHNICIAN,
  type RoomStaffUser,
} from '../../../../exam-room/application/room-access.service.js'

const STAFF: RoomStaffUser = { id: 'staff-1', permissions: [MANAGE_ALL] }
const codes = new AccessCodeService(
  'unit-test-secret-of-at-least-32-characters',
)

describe('ReleaseSessionUseCase', () => {
  async function setup() {
    const packages = new FakeExamPackageRepository()
    const schedules = new FakeExamScheduleRepository(packages)
    const questions = new FakeQuestionRepository()
    const sessions = new FakeExamSessionRepository()
    const rooms = new FakeExamRoomRepository()
    const { schedule } = await schedulePaper(
      { packages, schedules, questions },
      [choiceSpec('B')],
    )
    sessions.sessions.set('a', sessionFor(schedule, { id: 'a' }))
    return {
      schedule,
      schedules,
      sessions,
      rooms,
      release: new ReleaseSessionUseCase(
        sessions,
        new FakeSessionRecoveryRepository(sessions, rooms, packages),
        new RoomAccessService(rooms),
      ),
    }
  }

  it('frees the device and keeps seed and deadline', async () => {
    const { sessions, rooms, release } = await setup()
    const before = sessions.sessions.get('a')!

    const released = await release.execute(
      STAFF,
      'a',
      'Siswa pindah perangkat',
      NOW,
    )

    expect(released).toMatchObject({
      deviceId: null,
      releasedAt: NOW,
      releasedById: STAFF.id,
      requiresTokenReentry: true,
      shuffleSeed: before.shuffleSeed,
      deadline: before.deadline,
    })
    expect((await rooms.listAuditLogs('a'))[0]).toMatchObject({
      action: 'RELEASE_DEVICE',
      actorId: STAFF.id,
      reason: 'Siswa pindah perangkat',
    })
  })

  it('is refused for a finished session', async () => {
    const { schedule, sessions, release } = await setup()
    sessions.sessions.set(
      'done',
      sessionFor(schedule, { id: 'done', status: 'SUBMITTED' }),
    )

    await expect(
      release.execute(STAFF, 'done', 'Siswa pindah perangkat', NOW),
    ).rejects.toThrow(ConflictException)
    await expect(
      release.execute(STAFF, 'missing', 'Siswa pindah perangkat', NOW),
    ).rejects.toThrow(NotFoundException)
  })

  it('lets the student resume on another device afterwards', async () => {
    const { schedule, schedules, sessions, rooms, release } = await setup()
    const start = new StartExamSessionUseCase(
      new FakeStudentIdentity(),
      new FakeEnrollment(),
      schedules,
      sessions,
      new FakeExamAccessAttemptRepository(),
      codes,
      new FakeSessionFinalizer(),
      rooms,
    )
    const input = (deviceId: string) => ({
      accessCode: codes.codeFor(schedule.id, schedule.tokenRotation, NOW).code,
      deviceId,
    })
    const first = await start.execute(
      STUDENT_USER,
      schedule.id,
      input('device-1'),
      NOW,
    )
    await expect(
      start.execute(STUDENT_USER, schedule.id, input('device-2'), NOW),
    ).rejects.toThrow(ConflictException)

    await release.execute(STAFF, first.sessionId, 'Siswa pindah perangkat', NOW)
    const resumed = await start.execute(
      STUDENT_USER,
      schedule.id,
      input('device-2'),
      NOW,
    )

    expect(resumed.sessionId).toBe(first.sessionId)
    expect(sessions.sessions.get(first.sessionId)?.deviceId).toBe('device-2')
  })

  it('lists the sessions of a schedule with paging and 404 for an unknown schedule', async () => {
    const { schedule, schedules, sessions } = await setup()
    const list = new ListScheduleSessionsUseCase(
      schedules,
      sessions,
      new FakeStudentDirectory(),
    )

    expect(await list.execute(schedule.id, 1, 10)).toMatchObject({
      total: 1,
      page: 1,
      limit: 10,
    })
    await expect(list.execute('missing')).rejects.toThrow(NotFoundException)
  })

  it('carries the student name and nis, and tolerates a student that is gone', async () => {
    const { schedule, schedules, sessions } = await setup()

    const known = await new ListScheduleSessionsUseCase(
      schedules,
      sessions,
      new FakeStudentDirectory(),
    ).execute(schedule.id)
    const missing = await new ListScheduleSessionsUseCase(
      schedules,
      sessions,
      new FakeStudentDirectory([]),
    ).execute(schedule.id)

    expect(known.data[0]).toMatchObject({
      studentName: 'Ahmad Fauzi',
      studentNis: '2024001',
    })
    expect(missing.data[0]).toMatchObject({
      studentName: null,
      studentNis: null,
    })
  })

  it('refuses a technician of another room and allows the one on duty', async () => {
    const { schedule, sessions, rooms, release } = await setup()
    const event = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Ganjil',
      type: 'UTS',
      startsAt: NOW,
      endsAt: new Date('2026-11-02T04:00:00.000Z'),
      createdById: STAFF.id,
    })
    const roomA = await rooms.createRoom({
      eventId: event.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 30,
      technicianUserId: 'tech-a',
    })
    const roomB = await rooms.createRoom({
      eventId: event.id,
      code: 'R02',
      name: 'Ruang 02',
      capacity: 30,
      technicianUserId: 'tech-b',
    })
    const seated = sessionFor(schedule, { id: 'seated', roomId: roomB.id })
    sessionsSet(sessions, seated)
    const techA: RoomStaffUser = {
      id: 'tech-a',
      permissions: [TECHNICIAN],
    }
    const techB: RoomStaffUser = {
      id: 'tech-b',
      permissions: [TECHNICIAN],
    }

    await expect(
      release.execute(techA, 'seated', 'Siswa pindah perangkat', NOW),
    ).rejects.toThrow(ForbiddenException)
    await expect(
      release.execute(techB, 'seated', 'Siswa pindah perangkat', NOW),
    ).resolves.toMatchObject({
      id: 'seated',
      deviceId: null,
    })
    expect(roomA.id).not.toBe(roomB.id)
  })

  it('lets a supervisor release during their own slot only', async () => {
    const { schedule, sessions, rooms, release } = await setup()
    const event = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Ganjil',
      type: 'UTS',
      startsAt: NOW,
      endsAt: new Date('2026-11-02T04:00:00.000Z'),
      createdById: STAFF.id,
    })
    const room = await rooms.createRoom({
      eventId: event.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 30,
    })
    await rooms.assignSupervisor({
      roomId: room.id,
      startsAt: new Date('2026-11-02T01:00:00.000Z'),
      endsAt: new Date('2026-11-02T03:00:00.000Z'),
      scheduledUserId: 'sup-a',
    })
    sessionsSet(
      sessions,
      sessionFor(schedule, { id: 'seated', roomId: room.id }),
    )
    const supervisor: RoomStaffUser = {
      id: 'sup-a',
      permissions: [SUPERVISE],
    }

    await expect(
      release.execute(supervisor, 'seated', 'Siswa pindah perangkat', NOW),
    ).resolves.toMatchObject({
      deviceId: null,
    })
    sessionsSet(
      sessions,
      sessionFor(schedule, { id: 'again', roomId: room.id }),
    )
    await expect(
      release.execute(
        supervisor,
        'again',
        'Siswa pindah perangkat',
        new Date('2026-11-02T05:00:00.000Z'),
      ),
    ).rejects.toThrow(ForbiddenException)
  })
})

function sessionsSet(
  sessions: FakeExamSessionRepository,
  row: ReturnType<typeof sessionFor>,
): void {
  sessions.sessions.set(row.id, row)
}
