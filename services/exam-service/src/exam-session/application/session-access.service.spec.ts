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

const ACTOR = { id: STUDENT_USER.id, deviceId: 'device-1' }

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
})
