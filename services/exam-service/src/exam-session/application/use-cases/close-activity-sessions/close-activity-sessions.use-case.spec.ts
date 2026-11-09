import { FakeExamPackageRepository } from '../../../../exam-package/application/exam-package.repository.fake.js'
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
  let useCase: CloseActivitySessionsUseCase

  beforeEach(() => {
    packages = new FakeExamPackageRepository()
    schedules = new FakeExamScheduleRepository(packages)
    questions = new FakeQuestionRepository()
    sessions = new FakeExamSessionRepository(schedules)
    useCase = new CloseActivitySessionsUseCase(
      sessions,
      new FinalizeSessionService(sessions, schedules, packages, questions),
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

  const belongTo = (scheduleId: string, activityId: string) => {
    const schedule = schedules.schedules.get(scheduleId)!
    schedules.schedules.set(scheduleId, { ...schedule, activityId })
  }

  it('expires every running session and keeps the saved answers', async () => {
    const { schedule, questionIds } = await schedulePaper(
      { packages, schedules, questions },
      [ESSAY],
    )
    belongTo(schedule.id, ACTIVITY_ID)
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
      sessions.auditLogs.map((row) => ({
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

  it('expires the running makeup sessions of the activity too', async () => {
    const { schedule, questionIds } = await schedulePaper(
      { packages, schedules, questions },
      [ESSAY],
    )
    belongTo(schedule.id, ACTIVITY_ID)
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
      participants: [],
    })
    sessions.sessions.set('m', sessionFor(makeup!, { id: 'm' }))
    saveAnswer('m', questionIds[0])

    expect(await useCase.execute(ACTIVITY_ID, ADMIN_ID, LATER)).toBe(1)

    expect(sessions.sessions.get('m')?.status).toBe('EXPIRED')
    expect(sessions.answers.get('answer-m')?.answer).toEqual({
      text: 'jawaban',
    })
    expect(sessions.auditLogs).toMatchObject([
      {
        action: 'CLOSED_BY_ADMIN',
        sessionId: 'm',
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
    belongTo(schedule.id, ACTIVITY_ID)
    belongTo(other.schedule.id, OTHER_ACTIVITY_ID)
    sessions.sessions.set('a', sessionFor(schedule, { id: 'a' }))
    sessions.sessions.set('z', sessionFor(other.schedule, { id: 'z' }))
    saveAnswer('a', questionIds[0])

    expect(await useCase.execute(ACTIVITY_ID, ADMIN_ID, LATER)).toBe(1)

    expect(sessions.sessions.get('a')?.status).toBe('EXPIRED')
    expect(sessions.sessions.get('z')?.status).toBe('IN_PROGRESS')
    expect(sessions.auditLogs).toHaveLength(1)
  })

  it('closes nothing and audits nothing when the audit write fails', async () => {
    const { schedule, questionIds } = await schedulePaper(
      { packages, schedules, questions },
      [ESSAY],
    )
    belongTo(schedule.id, ACTIVITY_ID)
    sessions.sessions.set('a', sessionFor(schedule, { id: 'a' }))
    saveAnswer('a', questionIds[0])
    sessions.auditFailure = new Error('audit down')

    await expect(useCase.execute(ACTIVITY_ID, ADMIN_ID, LATER)).rejects.toThrow(
      'audit down',
    )

    expect(sessions.sessions.get('a')?.status).toBe('IN_PROGRESS')
    expect(sessions.auditLogs).toHaveLength(0)
  })

  it('skips a session the student submitted while the close was running', async () => {
    const { schedule, questionIds } = await schedulePaper(
      { packages, schedules, questions },
      [ESSAY],
    )
    belongTo(schedule.id, ACTIVITY_ID)
    sessions.sessions.set(
      'b',
      sessionFor(schedule, { id: 'b', status: 'SUBMITTED', submittedAt: NOW }),
    )
    saveAnswer('b', questionIds[0])
    vi.spyOn(sessions, 'findInProgressIdsByActivity').mockResolvedValueOnce([
      'b',
    ])

    expect(await useCase.execute(ACTIVITY_ID, ADMIN_ID, LATER)).toBe(0)

    expect(sessions.sessions.get('b')?.status).toBe('SUBMITTED')
    expect(sessions.auditLogs).toHaveLength(0)
  })
})
