import { BadRequestException, NotFoundException } from '@nestjs/common'
import { FakeExamPackageRepository } from '../../exam-package.repository.fake.js'
import { FakeQuestionRepository } from '../../../../question/application/question.repository.fake.js'
import { FakeExamScheduleRepository } from '../../../../exam-schedule/application/exam-schedule.repository.fake.js'
import { FakeExamRoomRepository } from '../../../../exam-room/application/exam-room.repository.fake.js'
import { FakeExamSessionRepository } from '../../../../exam-session/application/exam-session.repository.fake.js'
import { FakeSessionRecoveryRepository } from '../../../../exam-session/application/session-recovery.repository.fake.js'
import {
  NOW,
  choiceSpec,
  schedulePaper,
  sessionFor,
} from '../../../../exam-session/application/exam-session.test-support.js'
import { seedPackage } from '../../exam-package.test-support.js'
import { AdjustPackageItemKeyUseCase } from './adjust-package-item-key.use-case.js'

const ACTOR = { id: '11111111-1111-4111-8111-111111111111' }

async function setup() {
  const packages = new FakeExamPackageRepository()
  const questions = new FakeQuestionRepository()
  const schedules = new FakeExamScheduleRepository(packages)
  const rooms = new FakeExamRoomRepository()
  const sessions = new FakeExamSessionRepository()
  const { schedule, questionIds } = await schedulePaper(
    { packages, schedules, questions },
    [choiceSpec('B', 'Soal pertama'), choiceSpec('A', 'Soal kedua')],
  )
  const pkg = [...packages.packages.values()][0]
  const useCase = new AdjustPackageItemKeyUseCase(
    packages,
    schedules,
    questions,
    sessions,
    new FakeSessionRecoveryRepository(sessions, rooms, packages),
  )
  return {
    packages,
    schedules,
    sessions,
    rooms,
    useCase,
    schedule,
    pkg,
    questionIds,
  }
}

function seedAnswered(
  sessions: FakeExamSessionRepository,
  scheduleId: string,
  questionId: string,
  status: 'SUBMITTED' | 'EXPIRED' | 'GRADED' | 'IN_PROGRESS',
  id: string,
  key: 'A' | 'B',
): void {
  sessions.sessions.set(
    id,
    sessionFor({ id: scheduleId } as never, { id, status }),
  )
  sessions.answers.set(`${id}-${questionId}`, {
    id: `${id}-${questionId}`,
    sessionId: id,
    questionId,
    clientId: `c-${id}`,
    answer: { key },
    receivedAfterDeadline: false,
    score: 0,
    gradedById: null,
    gradedAt: null,
    gradeNote: null,
    createdAt: NOW,
    updatedAt: NOW,
  })
  sessions.publications.set(id, 'SENT')
}

describe('AdjustPackageItemKeyUseCase', () => {
  it('marks a question BONUS_ALL and rescoring every finished session resets its publication', async () => {
    const { packages, sessions, useCase, schedule, pkg, questionIds } =
      await setup()
    seedAnswered(sessions, schedule.id, questionIds[0], 'SUBMITTED', 's-1', 'A')
    seedAnswered(sessions, schedule.id, questionIds[0], 'GRADED', 's-2', 'A')
    seedAnswered(sessions, schedule.id, questionIds[0], 'EXPIRED', 's-3', 'A')
    seedAnswered(
      sessions,
      schedule.id,
      questionIds[0],
      'IN_PROGRESS',
      's-4',
      'A',
    )

    const result = await useCase.execute(
      ACTOR,
      pkg.id,
      questionIds[0],
      { resolution: 'BONUS_ALL', reason: 'Soal nomor 1 salah kunci' },
      NOW,
    )

    expect(result.rescoredSessions).toBe(3)
    const adjusted = (await packages.findById(pkg.id))!.items.find(
      (item) => item.questionId === questionIds[0],
    )
    expect(adjusted).toMatchObject({ resolution: 'BONUS_ALL' })
    expect(sessions.sessions.get('s-1')?.rawScore).toBe(2)
    expect(sessions.sessions.get('s-2')?.rawScore).toBe(2)
    expect(sessions.sessions.get('s-3')?.rawScore).toBe(2)
    expect(sessions.sessions.get('s-4')?.rawScore).toBeNull()
    expect(sessions.publications.get('s-1')).toBe('PENDING')
    expect(sessions.publications.get('s-4')).toBe('SENT')
  })

  it('scores against the replacement key for KEY_OVERRIDE', async () => {
    const { packages, sessions, useCase, schedule, pkg, questionIds } =
      await setup()
    seedAnswered(sessions, schedule.id, questionIds[0], 'GRADED', 's-1', 'A')

    await useCase.execute(
      ACTOR,
      pkg.id,
      questionIds[0],
      {
        resolution: 'KEY_OVERRIDE',
        overrideContent: {
          choices: [
            { key: 'A', html: 'A' },
            { key: 'B', html: 'B' },
            { key: 'C', html: 'C' },
            { key: 'D', html: 'D' },
            { key: 'E', html: 'E' },
          ],
          answer: { key: 'A' },
        },
        reason: 'Kunci resmi berubah ke A',
      },
      NOW,
    )

    expect(sessions.sessions.get('s-1')?.rawScore).toBe(2)
    expect(sessions.publications.get('s-1')).toBe('PENDING')
    const adjusted = (await packages.findById(pkg.id))!.items.find(
      (item) => item.questionId === questionIds[0],
    )
    expect(adjusted?.resolution).toBe('KEY_OVERRIDE')
  })

  it('refuses a short reason, an unknown resolution and a missing override', async () => {
    const { useCase, pkg, questionIds } = await setup()

    await expect(
      useCase.execute(ACTOR, pkg.id, questionIds[0], {
        resolution: 'BONUS_ALL',
        reason: 'hm',
      }),
    ).rejects.toThrow(BadRequestException)
    await expect(
      useCase.execute(ACTOR, pkg.id, questionIds[0], {
        resolution: 'BONUS_ALL',
        reason: 'Soal salah kunci',
        overrideContent: undefined,
      }),
    ).resolves.toMatchObject({ resolution: 'BONUS_ALL' })
    await expect(
      useCase.execute(ACTOR, pkg.id, questionIds[0], {
        resolution: 'KEY_OVERRIDE',
        reason: 'Soal salah kunci',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('answers 404 for an unknown package and a question outside it', async () => {
    const { useCase, pkg, questionIds } = await setup()

    await expect(
      useCase.execute(
        ACTOR,
        '22222222-2222-4222-8222-222222222222',
        questionIds[0],
        { resolution: 'NORMAL', reason: 'Kembalikan kunci' },
      ),
    ).rejects.toThrow(NotFoundException)
    await expect(
      useCase.execute(ACTOR, pkg.id, '33333333-3333-4333-8333-333333333333', {
        resolution: 'NORMAL',
        reason: 'Kembalikan kunci',
      }),
    ).rejects.toThrow(NotFoundException)
  })
})

describe('AdjustPackageItemKeyUseCase key override shape', () => {
  async function setupTyped() {
    const packages = new FakeExamPackageRepository()
    const questions = new FakeQuestionRepository()
    const schedules = new FakeExamScheduleRepository(packages)
    const rooms = new FakeExamRoomRepository()
    const sessions = new FakeExamSessionRepository()
    const pkg = await seedPackage(packages, questions, [
      {
        type: 'TRUE_FALSE',
        content: { answer: { value: true } },
      },
      {
        type: 'MULTIPLE_RESPONSE',
        content: {
          choices: [
            { key: 'A', html: 'A' },
            { key: 'B', html: 'B' },
          ],
          answer: { keys: ['A'] },
        },
      },
      {
        type: 'SHORT_ANSWER',
        content: {
          answer: {
            accepted: ['jakarta'],
            ignoreCase: true,
            ignoreHarakat: false,
          },
        },
      },
    ])
    const useCase = new AdjustPackageItemKeyUseCase(
      packages,
      schedules,
      questions,
      sessions,
      new FakeSessionRecoveryRepository(sessions, rooms, packages),
    )
    return { useCase, pkg, ids: pkg.items.map((item) => item.questionId) }
  }

  it('accepts the matching shape for every type', async () => {
    const { useCase, pkg, ids } = await setupTyped()

    await expect(
      useCase.execute(ACTOR, pkg.id, ids[0], {
        resolution: 'KEY_OVERRIDE',
        overrideContent: { answer: { value: false } },
        reason: 'Kunci benar salah',
      }),
    ).resolves.toMatchObject({ resolution: 'KEY_OVERRIDE' })
    await expect(
      useCase.execute(ACTOR, pkg.id, ids[1], {
        resolution: 'KEY_OVERRIDE',
        overrideContent: { answer: { keys: ['A', 'B'] } },
        reason: 'Kunci ganda berubah',
      }),
    ).resolves.toMatchObject({ resolution: 'KEY_OVERRIDE' })
    await expect(
      useCase.execute(ACTOR, pkg.id, ids[2], {
        resolution: 'KEY_OVERRIDE',
        overrideContent: { answer: { accepted: ['jkt'] } },
        reason: 'Jawaban singkat meluas',
      }),
    ).resolves.toMatchObject({ resolution: 'KEY_OVERRIDE' })
  })

  it('refuses an override that does not match the item type', async () => {
    const { useCase, pkg, ids } = await setupTyped()

    await expect(
      useCase.execute(ACTOR, pkg.id, ids[0], {
        resolution: 'KEY_OVERRIDE',
        overrideContent: { answer: { key: 'A' } },
        reason: 'Salah bentuk',
      }),
    ).rejects.toThrow(BadRequestException)
    await expect(
      useCase.execute(ACTOR, pkg.id, ids[1], {
        resolution: 'KEY_OVERRIDE',
        overrideContent: { answer: { key: 'A' } },
        reason: 'Salah bentuk',
      }),
    ).rejects.toThrow(BadRequestException)
  })
})
