import { FakeExamPackageRepository } from '../../../../exam-package/application/exam-package.repository.fake.js'
import { FakeExamRoomRepository } from '../../../../exam-room/application/exam-room.repository.fake.js'
import { FakeExamScheduleRepository } from '../../../../exam-schedule/application/exam-schedule.repository.fake.js'
import { FakeQuestionRepository } from '../../../../question/application/question.repository.fake.js'
import type { AnswerPayload } from '../../../domain/policies/validate-answer-shape.policy.js'
import { FakeExamSessionRepository } from '../../exam-session.repository.fake.js'
import {
  NOW,
  schedulePaper,
  sessionFor,
} from '../../exam-session.test-support.js'
import { FinalizeSessionService } from '../../finalize-session.service.js'
import { CloseActivitySessionsUseCase } from './close-activity-sessions.use-case.js'

const ACTIVITY_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ACTIVITY_ID = '22222222-2222-4222-8222-222222222222'
const ADMIN_ID = '33333333-3333-4333-8333-333333333333'
const OTHER_STUDENT = '44444444-4444-4444-8444-444444444444'
const LATER = new Date('2026-11-02T03:10:00.000Z')

const ESSAY = { type: 'ESSAY' as const, content: { guideHtml: null } }

describe('CloseActivitySessionsUseCase', () => {
  let packages: FakeExamPackageRepository
  let schedules: FakeExamScheduleRepository
  let questions: FakeQuestionRepository
  let sessions: FakeExamSessionRepository
  let rooms: FakeExamRoomRepository
  let useCase: CloseActivitySessionsUseCase

  beforeEach(() => {
    packages = new FakeExamPackageRepository()
    schedules = new FakeExamScheduleRepository(packages)
    questions = new FakeQuestionRepository()
    sessions = new FakeExamSessionRepository()
    rooms = new FakeExamRoomRepository()
    useCase = new CloseActivitySessionsUseCase(
      sessions,
      new FinalizeSessionService(sessions, schedules, packages, questions),
      rooms,
    )
  })

  const saveAnswer = (sessionId: string, questionId: string) => {
    const id = `answer-${sessionId}`
    const answer: AnswerPayload = { text: 'jawaban' }
    sessions.answers.set(id, {
      id,
      sessionId,
      questionId,
      answer,
      clientId: `client-${sessionId}`,
      receivedAfterDeadline: false,
      score: null,
      gradedById: null,
      gradedAt: null,
      gradeNote: null,
      createdAt: NOW,
      updatedAt: NOW,
    })
  }

  it('expires every running session and keeps the saved answers', async () => {
    const { schedule, questionIds } = await schedulePaper(
      { packages, schedules, questions },
      [ESSAY],
    )
    sessions.activityOfSchedule.set(schedule.id, ACTIVITY_ID)
    sessions.sessions.set('a', sessionFor(schedule, { id: 'a' }))
    sessions.sessions.set(
      'b',
      sessionFor(schedule, { id: 'b', studentId: OTHER_STUDENT }),
    )
    sessions.sessions.set(
      'c',
      sessionFor(schedule, { id: 'c', status: 'SUBMITTED', submittedAt: NOW }),
    )
    saveAnswer('a', questionIds[0])
    saveAnswer('b', questionIds[0])

    const closed = await useCase.execute(ACTIVITY_ID, ADMIN_ID, LATER)

    expect(closed).toBe(2)
    expect(sessions.sessions.get('a')?.status).toBe('EXPIRED')
    expect(sessions.sessions.get('b')?.status).toBe('EXPIRED')
    expect(sessions.sessions.get('c')).toMatchObject({
      status: 'SUBMITTED',
      submittedAt: NOW,
    })
    expect(sessions.answers.get('answer-a')?.answer).toEqual({
      text: 'jawaban',
    })
    expect(sessions.answers.get('answer-b')?.answer).toEqual({
      text: 'jawaban',
    })
    expect(
      rooms.auditLogs.map((row) => ({
        action: row.action,
        sessionId: row.sessionId,
        actorId: row.actorId,
        metadata: row.metadata,
      })),
    ).toEqual([
      {
        action: 'CLOSED_BY_ADMIN',
        sessionId: 'a',
        actorId: ADMIN_ID,
        metadata: { activityId: ACTIVITY_ID },
      },
      {
        action: 'CLOSED_BY_ADMIN',
        sessionId: 'b',
        actorId: ADMIN_ID,
        metadata: { activityId: ACTIVITY_ID },
      },
    ])
  })

  it('leaves the running sessions of another activity alone', async () => {
    const { schedule, questionIds } = await schedulePaper(
      { packages, schedules, questions },
      [ESSAY],
    )
    const other = await schedulePaper({ packages, schedules, questions }, [
      ESSAY,
    ])
    sessions.activityOfSchedule.set(schedule.id, ACTIVITY_ID)
    sessions.activityOfSchedule.set(other.schedule.id, OTHER_ACTIVITY_ID)
    sessions.sessions.set('a', sessionFor(schedule, { id: 'a' }))
    sessions.sessions.set('z', sessionFor(other.schedule, { id: 'z' }))
    saveAnswer('a', questionIds[0])

    expect(await useCase.execute(ACTIVITY_ID, ADMIN_ID, LATER)).toBe(1)

    expect(sessions.sessions.get('a')?.status).toBe('EXPIRED')
    expect(sessions.sessions.get('z')?.status).toBe('IN_PROGRESS')
    expect(rooms.auditLogs).toHaveLength(1)
  })
})
