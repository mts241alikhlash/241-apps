import { ConflictException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { FakeExamActivityRepository } from '../../../../exam-activity/application/exam-activity.repository.fake.js'
import { FakeExamPackageRepository } from '../../../../exam-package/application/exam-package.repository.fake.js'
import { FakeExamScheduleRepository } from '../../../../exam-schedule/application/exam-schedule.repository.fake.js'
import type { ExamSchedule } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import type { RoomStaffUser } from '../../../../exam-room/application/room-access.service.js'
import { FakeQuestionRepository } from '../../../../question/application/question.repository.fake.js'
import type { ExamSession } from '../../../domain/entities/exam-session.entity.js'
import { FakeExamSessionRepository } from '../../exam-session.repository.fake.js'
import {
  STUDENT_USER,
  choiceSpec,
  schedulePaper,
  sessionAccess,
  sessionFor,
} from '../../exam-session.test-support.js'
import { FinalizeSessionService } from '../../finalize-session.service.js'
import type { SessionRecoveryService } from '../../session-recovery.service.js'
import { SaveAnswerUseCase } from '../save-answer/save-answer.use-case.js'
import { SaveAnswersBatchUseCase } from '../save-answers-batch/save-answers-batch.use-case.js'
import { SubmitExamSessionUseCase } from '../submit-exam-session/submit-exam-session.use-case.js'
import { ExtendSessionTimeUseCase } from './extend-session-time.use-case.js'

const MS_PER_MINUTE = 60_000
const USER: RoomStaffUser = { id: 'admin-1', permissions: [] }
const ENDS_AT = new Date('2026-11-14T08:00:00.000Z')

function sessionWithDeadline(deadline: Date): ExamSession {
  return {
    id: 'session-1',
    scheduleId: 'schedule-1',
    status: 'IN_PROGRESS',
    extraMinutes: 0,
    deadline,
    finalizeAt: new Date(deadline.getTime() + 10 * MS_PER_MINUTE),
  } as unknown as ExamSession
}

function setup(session: ExamSession, schedule: ExamSchedule | null) {
  const apply = vi.fn((_u, _id, _action, _reason, change) =>
    Promise.resolve({ ...session, ...change(session) }),
  )
  const recovery = {
    load: vi.fn(() => Promise.resolve(session)),
    authorize: vi.fn(() => Promise.resolve(undefined)),
    apply,
  } as unknown as SessionRecoveryService
  const schedules = {
    findById: vi.fn(() => Promise.resolve(schedule)),
  } as unknown as IExamScheduleRepository
  return {
    apply,
    useCase: new ExtendSessionTimeUseCase(
      recovery,
      schedules,
      new MyExamsCacheService(),
    ),
  }
}

import { MyExamsCacheService } from '../../my-exams-cache.service.js'
describe('ExtendSessionTimeUseCase', () => {
  it('refuses an extension that passes the schedule end by more than 30 minutes', async () => {
    const session = sessionWithDeadline(ENDS_AT)
    const { apply, useCase } = setup(session, {
      endsAt: ENDS_AT,
    } as ExamSchedule)

    await expect(
      useCase.execute(USER, session.id, 31, 'Server lambat'),
    ).rejects.toThrow(
      new ConflictException(
        'Tambahan waktu melewati batas 30 menit setelah jam selesai ujian',
      ),
    )
    expect(apply).not.toHaveBeenCalled()
  })

  it('allows an extension that ends exactly 30 minutes after the schedule end', async () => {
    const session = sessionWithDeadline(ENDS_AT)
    const { apply, useCase } = setup(session, {
      endsAt: ENDS_AT,
    } as ExamSchedule)

    await useCase.execute(USER, session.id, 30, 'Server lambat')

    expect(apply).toHaveBeenCalledOnce()
  })

  it('extends by exactly the requested minutes when inside the window', async () => {
    const deadline = new Date(ENDS_AT.getTime() - 30 * MS_PER_MINUTE)
    const session = sessionWithDeadline(deadline)
    const { apply, useCase } = setup(session, {
      endsAt: ENDS_AT,
    } as ExamSchedule)

    const extended = await useCase.execute(
      USER,
      session.id,
      15,
      'Server lambat',
    )

    expect(apply).toHaveBeenCalledOnce()
    expect(extended.deadline.getTime()).toBe(
      deadline.getTime() + 15 * MS_PER_MINUTE,
    )
  })

  it('refuses when the schedule is missing', async () => {
    const session = sessionWithDeadline(ENDS_AT)
    const { useCase } = setup(session, null)

    await expect(
      useCase.execute(USER, session.id, 1, 'Server lambat'),
    ).rejects.toThrow(new ConflictException('Jadwal ujian tidak ditemukan'))
  })
})

describe('ExtendSessionTimeUseCase past the schedule end', () => {
  const END = new Date('2026-11-02T03:30:00.000Z')
  const MINUTES = (n: number) => new Date(END.getTime() + n * MS_PER_MINUTE)

  async function fixture() {
    const packages = new FakeExamPackageRepository()
    const schedules = new FakeExamScheduleRepository(packages)
    const questions = new FakeQuestionRepository()
    const sessions = new FakeExamSessionRepository()
    const paper = await schedulePaper({ packages, schedules, questions }, [
      choiceSpec('B'),
    ])
    const schedule = { ...paper.schedule, endsAt: END }
    schedules.schedules.set(schedule.id, schedule)
    sessions.sessions.set(
      'extended',
      sessionFor(schedule, { id: 'extended', client: 'SEB' }),
    )
    sessions.sessions.set(
      'plain',
      sessionFor(schedule, { id: 'plain', client: 'SEB' }),
    )
    const recovery = {
      load: (id: string) => Promise.resolve(sessions.sessions.get(id)),
      authorize: () => Promise.resolve(undefined),
      apply: (
        _user: RoomStaffUser,
        id: string,
        _action: string,
        _reason: string,
        change: (session: ExamSession) => Partial<ExamSession>,
      ) => {
        const current = sessions.sessions.get(id)
        return sessions.applyRecovery(id, change(current!) as never)
      },
    } as unknown as SessionRecoveryService
    const access = sessionAccess(
      sessions,
      new FinalizeSessionService(sessions, schedules, packages, questions),
      schedules,
      new FakeExamActivityRepository(),
    )
    const saveBatch = new SaveAnswersBatchUseCase(
      access,
      schedules,
      packages,
      questions,
      sessions,
    )
    return {
      sessions,
      questionId: paper.questionIds[0],
      extend: new ExtendSessionTimeUseCase(
        recovery,
        schedules,
        new MyExamsCacheService(),
      ),
      save: new SaveAnswerUseCase(
        access,
        schedules,
        packages,
        questions,
        sessions,
      ),
      submit: new SubmitExamSessionUseCase(
        access,
        schedules,
        sessions,
        new FinalizeSessionService(sessions, schedules, packages, questions),
        saveBatch,
      ),
    }
  }

  it('lets a student extended 10 minutes past the end save and submit at end plus 9 minutes', async () => {
    const f = await fixture()
    await f.extend.execute(USER, 'extended', 10, 'Tambah waktu')

    const at = MINUTES(9)
    await f.save.execute(
      STUDENT_USER,
      'extended',
      { questionId: f.questionId, clientId: 'c1', answer: { key: 'B' } },
      at,
    )
    const handed = await f.submit.execute(STUDENT_USER, 'extended', {}, at)

    expect(handed.submittedAt).toEqual(at)
  })

  it('stops a session that was not extended at the schedule end', async () => {
    const f = await fixture()
    await f.extend.execute(USER, 'extended', 10, 'Tambah waktu')

    await expect(
      f.save.execute(
        STUDENT_USER,
        'plain',
        { questionId: f.questionId, clientId: 'c1', answer: { key: 'B' } },
        END,
      ),
    ).rejects.toMatchObject({ code: 'TIME_UP' })
  })
})
