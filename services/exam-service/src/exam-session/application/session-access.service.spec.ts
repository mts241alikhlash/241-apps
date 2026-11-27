import { ConflictException } from '@nestjs/common'
import { FakeExamActivityRepository } from '../../exam-activity/application/exam-activity.repository.fake.js'
import { FakeExamPackageRepository } from '../../exam-package/application/exam-package.repository.fake.js'
import { FakeExamScheduleRepository } from '../../exam-schedule/application/exam-schedule.repository.fake.js'
import type { ExamSchedule } from '../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { FakeQuestionRepository } from '../../question/application/question.repository.fake.js'
import { FakeExamSessionRepository } from './exam-session.repository.fake.js'
import {
  ENDS,
  NOW,
  STARTS,
  STUDENT_USER,
  activityFor,
  scheduleExam,
  sessionAccess,
  sessionFor,
} from './exam-session.test-support.js'
import { FakeSessionFinalizer } from './session-finalizer.fake.js'
import { shiftBy } from './use-cases/extend-session-time/extend-session-time.use-case.js'

const ACTOR = { id: STUDENT_USER.id, deviceId: 'device-1' }
const MINUTE = 60_000
const at = (base: Date, minutes: number) =>
  new Date(base.getTime() + minutes * MINUTE)

describe('SessionAccessService', () => {
  let packages: FakeExamPackageRepository
  let schedules: FakeExamScheduleRepository
  let questions: FakeQuestionRepository
  let sessions: FakeExamSessionRepository
  let activities: FakeExamActivityRepository
  let schedule: ExamSchedule

  beforeEach(async () => {
    packages = new FakeExamPackageRepository()
    schedules = new FakeExamScheduleRepository(packages)
    questions = new FakeQuestionRepository()
    sessions = new FakeExamSessionRepository()
    activities = new FakeExamActivityRepository()
    schedule = await scheduleExam({ packages, schedules, questions })
  })

  const seed = (overrides: Partial<ExamSchedule> = {}) => {
    schedules.schedules.set(schedule.id, { ...schedule, ...overrides })
    sessions.sessions.set('a', sessionFor(schedule, { id: 'a' }))
  }

  const access = () =>
    sessionAccess(sessions, new FakeSessionFinalizer(), schedules, activities)

  it('loads a session inside the window', async () => {
    seed()

    await expect(access().loadOwned(ACTOR, 'a', NOW)).resolves.toMatchObject({
      id: 'a',
    })
  })

  it('refuses a session before the window opens', async () => {
    seed()
    const early = new Date(STARTS.getTime() - 1000)

    const error = await access()
      .loadOwned(ACTOR, 'a', early)
      .catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(ConflictException)
    expect(error).toMatchObject({ code: 'WINDOW_CLOSED' })
  })

  it('refuses a session once the window has closed', async () => {
    seed()

    const error = await access()
      .loadOwned(ACTOR, 'a', ENDS)
      .catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(ConflictException)
    expect(error).toMatchObject({ code: 'WINDOW_CLOSED' })
  })

  it('refuses a session whose activity is closed', async () => {
    const activity = await activityFor(activities, schedule, {
      status: 'CLOSED',
    })
    seed({ activityId: activity.id })

    const error = await access()
      .loadOwned(ACTOR, 'a', NOW)
      .catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(ConflictException)
    expect(error).toMatchObject({ code: 'WINDOW_CLOSED' })
  })

  describe('a session already in progress', () => {
    const lateStarter = async (status: 'ACTIVE' | 'CLOSED' = 'ACTIVE') => {
      const activity = await activityFor(activities, schedule, { status })
      schedules.schedules.set(schedule.id, {
        ...schedule,
        activityId: activity.id,
        endsAt: at(ENDS, 60),
      })
      sessions.sessions.set(
        'a',
        sessionFor(schedule, {
          id: 'a',
          startedAt: at(ENDS, -60),
          deadline: at(ENDS, 30),
          finalizeAt: at(ENDS, 40),
        }),
      )
    }

    it('stays writable after the activity ends while its own time runs', async () => {
      await lateStarter()

      await expect(
        access().loadWritable(ACTOR, 'a', at(ENDS, 15)),
      ).resolves.toMatchObject({ id: 'a', status: 'IN_PROGRESS' })
      await expect(
        access().loadOwned(ACTOR, 'a', at(ENDS, 15)),
      ).resolves.toMatchObject({ id: 'a' })
    })

    it('stays readable inside its grace after the deadline', async () => {
      await lateStarter()

      await expect(
        access().loadReadable(ACTOR, 'a', at(ENDS, 35)),
      ).resolves.toMatchObject({ id: 'a' })
    })

    it('is refused once its own finalizeAt has passed', async () => {
      await lateStarter()

      const error = await access()
        .loadWritable(ACTOR, 'a', at(ENDS, 40))
        .catch((thrown: unknown) => thrown)

      expect(error).toBeInstanceOf(ConflictException)
      expect(error).toMatchObject({ code: 'WINDOW_CLOSED' })
    })

    it('is refused when its activity was closed by hand', async () => {
      await lateStarter('CLOSED')

      const error = await access()
        .loadWritable(ACTOR, 'a', at(ENDS, -30))
        .catch((thrown: unknown) => thrown)

      expect(error).toBeInstanceOf(ConflictException)
      expect(error).toMatchObject({ code: 'WINDOW_CLOSED' })
    })

    it('stays writable after a room time extension past the schedule end', async () => {
      const running = sessionFor(schedule, { id: 'a' })
      sessions.sessions.set('a', { ...running, ...shiftBy(running, 30) })

      await expect(
        access().loadWritable(ACTOR, 'a', at(ENDS, 5)),
      ).resolves.toMatchObject({ id: 'a' })
    })

    it('still refuses a submitted session after the window', async () => {
      seed()
      sessions.sessions.set(
        'a',
        sessionFor(schedule, {
          id: 'a',
          status: 'SUBMITTED',
          finalizeAt: at(ENDS, 40),
        }),
      )

      const error = await access()
        .loadOwned(ACTOR, 'a', at(ENDS, 5))
        .catch((thrown: unknown) => thrown)

      expect(error).toMatchObject({ code: 'WINDOW_CLOSED' })
    })
  })
})
