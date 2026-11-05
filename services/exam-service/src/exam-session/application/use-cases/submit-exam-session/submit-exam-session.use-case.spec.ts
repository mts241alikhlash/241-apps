import { NotFoundException } from '@nestjs/common'
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
import { FinalizeSessionService } from '../../finalize-session.service.js'
import { SessionAccessService } from '../../session-access.service.js'
import { SaveAnswersBatchUseCase } from '../save-answers-batch/save-answers-batch.use-case.js'
import { SubmitExamSessionUseCase } from './submit-exam-session.use-case.js'

describe('SubmitExamSessionUseCase', () => {
  let packages: FakeExamPackageRepository
  let schedules: FakeExamScheduleRepository
  let questions: FakeQuestionRepository
  let sessions: FakeExamSessionRepository
  let finalizer: FinalizeSessionService
  let schedule: ExamSchedule
  let questionIds: string[]

  async function setup(count = 1) {
    packages = new FakeExamPackageRepository()
    schedules = new FakeExamScheduleRepository(packages)
    questions = new FakeQuestionRepository()
    sessions = new FakeExamSessionRepository()
    const paper = await schedulePaper(
      { packages, schedules, questions },
      Array.from({ length: count }, () => choiceSpec('B')),
    )
    schedule = paper.schedule
    questionIds = paper.questionIds
    sessions.sessions.set('a', sessionFor(schedule, { id: 'a' }))
    finalizer = new FinalizeSessionService(
      sessions,
      schedules,
      packages,
      questions,
    )
    const access = new SessionAccessService(sessions, finalizer)
    const saveBatch = new SaveAnswersBatchUseCase(
      access,
      schedules,
      packages,
      questions,
      sessions,
    )
    return {
      saveBatch,
      useCase: new SubmitExamSessionUseCase(
        access,
        schedules,
        sessions,
        finalizer,
        saveBatch,
      ),
    }
  }

  it('hands in the session and reports the outcome', async () => {
    const { useCase } = await setup()

    expect(await useCase.execute(STUDENT_USER, 'a', {}, NOW)).toEqual({
      status: 'GRADED',
      submittedAt: NOW,
      confirmedAnswerCount: 0,
      answersStored: true,
      serverTime: NOW,
    })
  })

  it('answers the same on a repeat', async () => {
    const { useCase } = await setup()
    const first = await useCase.execute(STUDENT_USER, 'a', {}, NOW)

    expect(
      await useCase.execute(
        STUDENT_USER,
        'a',
        {},
        new Date(NOW.getTime() + 60_000),
      ),
    ).toEqual({ ...first, serverTime: new Date(NOW.getTime() + 60_000) })
  })

  it('saves the pending answers before it finalises', async () => {
    const { useCase } = await setup()

    const result = await useCase.execute(
      STUDENT_USER,
      'a',
      {
        pendingAnswers: [
          { questionId: questionIds[0], clientId: 'c1', answer: { key: 'B' } },
        ],
        expectedAnswerCount: 1,
      },
      NOW,
    )

    expect(result).toMatchObject({
      status: 'GRADED',
      confirmedAnswerCount: 1,
      serverTime: NOW,
    })
    expect(sessions.answers.size).toBe(1)
  })

  it('keeps the violations the app reports with the hand-in', async () => {
    const { useCase } = await setup()

    await useCase.execute(STUDENT_USER, 'a', { violations: 4 }, NOW)

    expect(sessions.sessions.get('a')?.violationCount).toBe(4)
  })

  it('does not lower the violations a repeat reports', async () => {
    const { useCase } = await setup()
    await useCase.execute(STUDENT_USER, 'a', { violations: 4 }, NOW)

    await useCase.execute(STUDENT_USER, 'a', { violations: 0 }, NOW)

    expect(sessions.sessions.get('a')?.violationCount).toBe(4)
  })

  it('refuses when the server holds fewer answers than the app claims', async () => {
    const { useCase, saveBatch } = await setup(10)
    await saveBatch.execute(
      STUDENT_USER,
      'a',
      {
        answers: questionIds.slice(0, 8).map((questionId, index) => ({
          questionId,
          clientId: `c${index}`,
          answer: { key: 'B' },
        })),
      },
      NOW,
    )

    await expect(
      useCase.execute(
        STUDENT_USER,
        'a',
        { expectedAnswerCount: 10, violations: 5 },
        NOW,
      ),
    ).rejects.toMatchObject({
      code: 'SHORTFALL',
      message:
        'Masih ada jawaban yang belum diterima server (8/10), silakan coba lagi',
    })
    expect(sessions.sessions.get('a')?.status).toBe('IN_PROGRESS')
    expect(sessions.sessions.get('a')?.violationCount).toBe(0)
  })

  it('refuses a hand-in that carries an item bound to another question', async () => {
    const { useCase, saveBatch } = await setup(2)
    await saveBatch.execute(
      STUDENT_USER,
      'a',
      {
        answers: [
          { questionId: questionIds[0], clientId: 'c1', answer: { key: 'B' } },
        ],
      },
      NOW,
    )

    await expect(
      useCase.execute(
        STUDENT_USER,
        'a',
        {
          pendingAnswers: [
            {
              questionId: questionIds[1],
              clientId: 'c1',
              answer: { key: 'B' },
            },
          ],
          expectedAnswerCount: 2,
          violations: 3,
        },
        NOW,
      ),
    ).rejects.toMatchObject({
      code: 'REBIND',
      message: 'Masih ada 1 jawaban yang perlu dikirim ulang dengan id baru',
    })
    expect(sessions.sessions.get('a')?.status).toBe('IN_PROGRESS')
    expect(sessions.sessions.get('a')?.violationCount).toBe(0)
  })

  it('refuses a hand-in when the schedule is gone', async () => {
    const { useCase } = await setup()
    schedules.schedules.delete(schedule.id)

    await expect(
      useCase.execute(STUDENT_USER, 'a', {}, NOW),
    ).rejects.toMatchObject({
      code: 'SCHEDULE_GONE',
      message: 'Jadwal ujian tidak ditemukan',
    })
    expect(sessions.sessions.get('a')?.status).toBe('IN_PROGRESS')
  })

  it('refuses a hand-in before the minimum submit time', async () => {
    const { useCase } = await setup()
    schedules.schedules.set(schedule.id, { ...schedule, minSubmitMinutes: 120 })

    await expect(
      useCase.execute(
        STUDENT_USER,
        'a',
        {},
        new Date('2026-11-02T03:20:00.000Z'),
      ),
    ).rejects.toMatchObject({
      code: 'MIN_SUBMIT',
      message: 'Ujian baru dapat dikumpulkan setelah berjalan 120 menit',
    })
    expect(sessions.sessions.get('a')?.status).toBe('IN_PROGRESS')
  })

  it('allows the hand-in once the schedule window has closed', async () => {
    const { useCase } = await setup()
    schedules.schedules.set(schedule.id, { ...schedule, minSubmitMinutes: 120 })

    const result = await useCase.execute(
      STUDENT_USER,
      'a',
      {},
      new Date('2026-11-02T03:31:00.000Z'),
    )

    expect(result.status).toBe('GRADED')
  })

  it('allows the hand-in once the minimum has passed', async () => {
    const { useCase } = await setup()
    schedules.schedules.set(schedule.id, { ...schedule, minSubmitMinutes: 30 })

    const result = await useCase.execute(
      STUDENT_USER,
      'a',
      {},
      new Date('2026-11-02T02:30:00.000Z'),
    )

    expect(result.status).toBe('GRADED')
  })

  it('answers a session already handed in without finalising it again', async () => {
    const { useCase } = await setup()
    await useCase.execute(
      STUDENT_USER,
      'a',
      {
        pendingAnswers: [
          { questionId: questionIds[0], clientId: 'c1', answer: { key: 'B' } },
        ],
      },
      NOW,
    )
    const finalize = vi.spyOn(finalizer, 'finalize')

    const result = await useCase.execute(STUDENT_USER, 'a', {}, NOW)

    expect(finalize).not.toHaveBeenCalled()
    expect(result).toEqual({
      status: 'GRADED',
      submittedAt: NOW,
      confirmedAnswerCount: 1,
      answersStored: true,
      serverTime: NOW,
    })
  })

  it('reports that carried answers were not stored when the session already closed', async () => {
    const { useCase } = await setup()
    sessions.sessions.set(
      'a',
      sessionFor(schedule, { id: 'a', status: 'EXPIRED' }),
    )

    const result = await useCase.execute(
      STUDENT_USER,
      'a',
      {
        pendingAnswers: [
          { questionId: questionIds[0], clientId: 'c1', answer: { key: 'B' } },
        ],
      },
      NOW,
    )

    expect(result).toMatchObject({
      status: 'EXPIRED',
      answersStored: false,
      confirmedAnswerCount: 0,
    })
    expect(sessions.answers.size).toBe(0)
  })

  it('reports the carried answers as stored when the session closed after saving them', async () => {
    const { useCase } = await setup()
    await useCase.execute(
      STUDENT_USER,
      'a',
      {
        pendingAnswers: [
          { questionId: questionIds[0], clientId: 'c1', answer: { key: 'B' } },
        ],
      },
      NOW,
    )

    const result = await useCase.execute(
      STUDENT_USER,
      'a',
      {
        pendingAnswers: [
          { questionId: questionIds[0], clientId: 'c1', answer: { key: 'B' } },
        ],
      },
      NOW,
    )

    expect(result).toMatchObject({
      answersStored: true,
      confirmedAnswerCount: 1,
    })
  })

  it('answers a submitted session with its stored confirmed count', async () => {
    const { useCase } = await setup()
    sessions.sessions.set(
      'a',
      sessionFor(schedule, { id: 'a', status: 'SUBMITTED', submittedAt: NOW }),
    )
    sessions.answers.set('answer-1', {
      id: 'answer-1',
      sessionId: 'a',
      questionId: questionIds[0],
      answer: { key: 'B' },
      clientId: 'c1',
      receivedAfterDeadline: false,
      score: null,
      gradedById: null,
      gradedAt: null,
      gradeNote: null,
      createdAt: NOW,
      updatedAt: NOW,
    })

    expect(await useCase.execute(STUDENT_USER, 'a', {}, NOW)).toEqual({
      status: 'SUBMITTED',
      submittedAt: NOW,
      confirmedAnswerCount: 1,
      answersStored: true,
      serverTime: NOW,
    })
  })

  it('counts the stored answers without loading every row', async () => {
    const { useCase } = await setup()
    const listAnswers = vi.spyOn(sessions, 'listAnswers')

    await useCase.execute(STUDENT_USER, 'a', { expectedAnswerCount: 0 }, NOW)

    expect(listAnswers).not.toHaveBeenCalled()
  })

  it('refuses to hand in the session of someone else', async () => {
    const { useCase } = await setup()

    await expect(
      useCase.execute({ id: 'intruder', deviceId: 'device-1' }, 'a', {}, NOW),
    ).rejects.toThrow(NotFoundException)
  })
})
