import { describe, expect, it } from 'vitest'
import { FakeExamActivityRepository } from '../../../../exam-activity/application/exam-activity.repository.fake.js'
import { FakeExamPackageRepository } from '../../../../exam-package/application/exam-package.repository.fake.js'
import { FakeExamRoomRepository } from '../../../../exam-room/application/exam-room.repository.fake.js'
import { FakeExamScheduleRepository } from '../../../../exam-schedule/application/exam-schedule.repository.fake.js'
import { FakeQuestionRepository } from '../../../../question/application/question.repository.fake.js'
import { FakeExamSessionRepository } from '../../exam-session.repository.fake.js'
import {
  STUDENT_USER,
  choiceSpec,
  schedulePaper,
  sessionAccess,
  sessionFor,
} from '../../exam-session.test-support.js'
import { FakeSessionFinalizer } from '../../session-finalizer.fake.js'
import { SuspendSessionUseCase } from './suspend-session.use-case.js'

const END = new Date('2026-11-02T03:30:00.000Z')
const NOW = new Date('2026-11-02T03:00:00.000Z')
const at = (iso: string) => new Date(iso)

async function setup() {
  const packages = new FakeExamPackageRepository()
  const schedules = new FakeExamScheduleRepository(packages)
  const questions = new FakeQuestionRepository()
  const sessions = new FakeExamSessionRepository()
  const rooms = new FakeExamRoomRepository()
  const paper = await schedulePaper({ packages, schedules, questions }, [
    choiceSpec('B'),
  ])
  const schedule = { ...paper.schedule, endsAt: END }
  schedules.schedules.set(schedule.id, schedule)
  const access = sessionAccess(
    sessions,
    new FakeSessionFinalizer(),
    schedules,
    new FakeExamActivityRepository(),
  )
  return {
    sessions,
    schedule,
    useCase: new SuspendSessionUseCase(access, sessions, rooms, schedules),
  }
}

describe('SuspendSessionUseCase', () => {
  it('stays capped at the schedule end after staff extended the session past it', async () => {
    const f = await setup()
    f.sessions.sessions.set(
      'a',
      sessionFor(f.schedule, {
        id: 'a',
        client: 'SEB',
        deadline: at('2026-11-02T03:40:00.000Z'),
        finalizeAt: at('2026-11-02T03:50:00.000Z'),
        extraMinutes: 10,
      }),
    )

    const window = await f.useCase.execute(
      STUDENT_USER,
      'a',
      { reason: 'CALL', seconds: 60, clientId: 'call-1' },
      at('2026-11-02T03:35:00.000Z'),
    )

    expect(window.extraMinutes).toBe(0)
    expect(window.deadline.toISOString()).toBe('2026-11-02T03:40:00.000Z')
    expect(f.sessions.sessions.get('a')?.extraMinutes).toBe(10)
  })

  it('adds at most the minutes left before the schedule end for a session that was not extended', async () => {
    const f = await setup()
    f.sessions.sessions.set(
      'a',
      sessionFor(f.schedule, {
        id: 'a',
        client: 'SEB',
        deadline: at('2026-11-02T03:20:00.000Z'),
        finalizeAt: at('2026-11-02T03:30:00.000Z'),
      }),
    )

    const window = await f.useCase.execute(
      STUDENT_USER,
      'a',
      { reason: 'CALL', seconds: 900, clientId: 'call-2' },
      NOW,
    )

    expect(window.extraMinutes).toBe(10)
    expect(window.deadline.toISOString()).toBe('2026-11-02T03:30:00.000Z')
  })
})
