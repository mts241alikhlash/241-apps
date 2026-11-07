import { BadRequestException, ConflictException } from '@nestjs/common'
import { FakeExamPackageRepository } from '../../../../exam-package/application/exam-package.repository.fake.js'
import { FakeExamScheduleRepository } from '../../../../exam-schedule/application/exam-schedule.repository.fake.js'
import { FakeQuestionRepository } from '../../../../question/application/question.repository.fake.js'
import type { ExamSchedule } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { FakeExamSessionRepository } from '../../exam-session.repository.fake.js'
import {
  NOW,
  STUDENT_USER,
  choiceSpec,
  schedulePaper,
  sessionFor,
} from '../../exam-session.test-support.js'
import { FakeSessionFinalizer } from '../../session-finalizer.fake.js'
import { SessionAccessService } from '../../session-access.service.js'
import { SaveAnswersBatchUseCase } from './save-answers-batch.use-case.js'

describe('SaveAnswersBatchUseCase', () => {
  let packages: FakeExamPackageRepository
  let schedules: FakeExamScheduleRepository
  let questions: FakeQuestionRepository
  let sessions: FakeExamSessionRepository
  let schedule: ExamSchedule

  async function setup(count = 2) {
    packages = new FakeExamPackageRepository()
    schedules = new FakeExamScheduleRepository(packages)
    questions = new FakeQuestionRepository()
    sessions = new FakeExamSessionRepository()
    const paper = await schedulePaper(
      { packages, schedules, questions },
      Array.from({ length: count }, () => choiceSpec()),
    )
    schedule = paper.schedule
    sessions.sessions.set('a', sessionFor(schedule, { id: 'a' }))
    return {
      questionIds: paper.questionIds,
      useCase: new SaveAnswersBatchUseCase(
        new SessionAccessService(sessions, new FakeSessionFinalizer()),
        schedules,
        packages,
        questions,
        sessions,
      ),
    }
  }

  const answerOf = (questionId: string, clientId: string, key = 'A') => ({
    questionId,
    clientId,
    answer: { key },
  })

  it('loads the paper once for a batch of 46 and confirms every answer', async () => {
    const { useCase, questionIds } = await setup(46)
    const findPinned = vi.spyOn(questions, 'findPinned')

    const result = await useCase.execute(
      STUDENT_USER,
      'a',
      {
        answers: questionIds.map((questionId, index) =>
          answerOf(questionId, `c${index}`),
        ),
      },
      NOW,
    )

    expect(findPinned).toHaveBeenCalledTimes(1)
    expect(result.confirmedCount).toBe(46)
    expect(result.confirmed).toHaveLength(46)
    expect(result.serverTime).toEqual(NOW)
    expect(sessions.answers.size).toBe(46)
  })

  it('keeps the last entry when one batch repeats a question', async () => {
    const { useCase, questionIds } = await setup()

    const result = await useCase.execute(
      STUDENT_USER,
      'a',
      {
        answers: [
          answerOf(questionIds[0], 'c1', 'A'),
          answerOf(questionIds[0], 'c2', 'C'),
        ],
      },
      NOW,
    )

    expect(result.confirmedCount).toBe(1)
    expect(result.confirmed).toHaveLength(1)
    expect([...sessions.answers.values()][0]).toMatchObject({
      questionId: questionIds[0],
      clientId: 'c2',
      answer: { key: 'C' },
    })
  })

  it('reports the items it refused instead of dropping them silently', async () => {
    const { useCase, questionIds } = await setup()

    const result = await useCase.execute(
      STUDENT_USER,
      'a',
      {
        answers: [
          answerOf(questionIds[0], 'c1', 'A'),
          answerOf(questionIds[1], 'c1', 'B'),
        ],
      },
      NOW,
    )

    expect(result.skipped).toEqual([
      { questionId: questionIds[1], clientId: 'c1' },
    ])
    expect(result.confirmed).toHaveLength(1)
    expect(result.confirmedCount).toBe(1)
  })

  it('records the heartbeat the app reports with the batch', async () => {
    const { useCase, questionIds } = await setup()

    await useCase.execute(
      STUDENT_USER,
      'a',
      {
        answers: [answerOf(questionIds[0], 'c1')],
        pendingLocalCount: 4,
        batteryLevel: 61,
        isCharging: true,
        dndGranted: false,
        lockTaskActive: true,
        batteryUnrestricted: true,
      },
      NOW,
    )

    expect(sessions.sessions.get('a')).toMatchObject({
      syncedAnswerCount: 1,
      unsyncedCount: 4,
      lastBatteryLevel: 61,
      isCharging: true,
      dndGranted: false,
      lockTaskActive: true,
      batteryUnrestricted: true,
      lastSeenAt: NOW,
    })
  })

  it('flags an answer that arrives after the deadline', async () => {
    const { useCase, questionIds } = await setup()

    const result = await useCase.execute(
      STUDENT_USER,
      'a',
      { answers: [answerOf(questionIds[0], 'c1')] },
      new Date('2026-11-02T03:35:00.000Z'),
    )

    expect(result.confirmed[0].receivedAfterDeadline).toBe(true)
  })

  it('rejects a question outside the package', async () => {
    const { useCase, questionIds } = await setup()

    await expect(
      useCase.execute(
        STUDENT_USER,
        'a',
        {
          answers: [
            answerOf(questionIds[0], 'c1'),
            answerOf('99999999-9999-4999-8999-999999999999', 'c2'),
          ],
        },
        NOW,
      ),
    ).rejects.toThrow(BadRequestException)
    expect(sessions.answers.size).toBe(0)
  })

  it('rejects a shape that does not fit the type', async () => {
    const { useCase, questionIds } = await setup()

    await expect(
      useCase.execute(
        STUDENT_USER,
        'a',
        {
          answers: [
            {
              questionId: questionIds[0],
              clientId: 'c1',
              answer: { keys: ['A'] },
            },
          ],
        },
        NOW,
      ),
    ).rejects.toThrow('Bentuk jawaban tidak sesuai dengan jenis soal')
    expect(sessions.answers.size).toBe(0)
  })

  it('rejects a batch after finalizeAt', async () => {
    const { useCase, questionIds } = await setup()

    await expect(
      useCase.execute(
        STUDENT_USER,
        'a',
        { answers: [answerOf(questionIds[0], 'c1')] },
        new Date('2026-11-02T03:40:00.000Z'),
      ),
    ).rejects.toMatchObject({
      code: 'WINDOW_CLOSED',
      message: 'Waktu pengiriman jawaban sudah habis',
    })
  })

  it('rejects a batch on a submitted session', async () => {
    const { useCase, questionIds } = await setup()
    sessions.sessions.set(
      'a',
      sessionFor(schedule, { id: 'a', status: 'SUBMITTED' }),
    )

    await expect(
      useCase.execute(
        STUDENT_USER,
        'a',
        { answers: [answerOf(questionIds[0], 'c1')] },
        NOW,
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('rejects a device the session is not bound to', async () => {
    const { useCase, questionIds } = await setup()

    await expect(
      useCase.execute(
        { ...STUDENT_USER, deviceId: 'device-2' },
        'a',
        { answers: [answerOf(questionIds[0], 'c1')] },
        NOW,
      ),
    ).rejects.toThrow(ConflictException)
  })
})
