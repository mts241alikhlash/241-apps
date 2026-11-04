import { Injectable } from '@nestjs/common'
import {
  ApiConflictException,
  ApiNotFoundException,
} from '../../../../core/filters/api-exception.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'
import { FinalizeSessionService } from '../../finalize-session.service.js'
import {
  SessionAccessService,
  type SessionActor,
} from '../../session-access.service.js'
import {
  SaveAnswersBatchUseCase,
  type SaveAnswerBatchInputItem,
} from '../save-answers-batch/save-answers-batch.use-case.js'

export interface SubmitExamSessionInput {
  violations?: number
  expectedAnswerCount?: number
  pendingAnswers?: SaveAnswerBatchInputItem[]
}

export interface SubmitResult {
  status: string
  submittedAt: Date | null
  confirmedAnswerCount: number
  answersStored: boolean
  serverTime: Date
}

@Injectable()
export class SubmitExamSessionUseCase {
  constructor(
    private readonly access: SessionAccessService,
    private readonly schedules: IExamScheduleRepository,
    private readonly sessions: IExamSessionRepository,
    private readonly finalizer: FinalizeSessionService,
    private readonly saveBatch: SaveAnswersBatchUseCase,
  ) {}

  async execute(
    user: SessionActor,
    sessionId: string,
    input: SubmitExamSessionInput = {},
    now: Date = new Date(),
  ): Promise<SubmitResult> {
    const session = await this.access.loadWritable(user, sessionId, now)
    if (session.status !== 'IN_PROGRESS') {
      const carried = input.pendingAnswers ?? []
      let stored = 0
      for (const item of carried) {
        const answer = await this.sessions.findAnswerByClientId(
          session.id,
          item.clientId,
        )
        if (answer !== null && answer.questionId === item.questionId)
          stored += 1
      }
      return {
        status: session.status,
        submittedAt: session.submittedAt,
        confirmedAnswerCount: await this.sessions.countAnswers(session.id),
        answersStored: stored === carried.length,
        serverTime: now,
      }
    }

    const schedule = await this.schedules.findById(session.scheduleId)
    if (schedule === null) {
      throw new ApiNotFoundException(
        'SCHEDULE_GONE',
        'Jadwal ujian tidak ditemukan',
      )
    }
    const minSubmitMinutes = schedule.minSubmitMinutes
    if (minSubmitMinutes > 0) {
      const earliestSubmitAt = Math.min(
        session.startedAt.getTime() + minSubmitMinutes * 60_000,
        session.deadline.getTime(),
      )
      if (now.getTime() < earliestSubmitAt) {
        throw new ApiConflictException(
          'MIN_SUBMIT',
          `Ujian baru dapat dikumpulkan setelah berjalan ${minSubmitMinutes} menit`,
        )
      }
    }

    let actualCount: number
    if (input.pendingAnswers?.length) {
      const batch = await this.saveBatch.execute(
        user,
        session.id,
        { answers: input.pendingAnswers },
        now,
      )
      if (batch.skipped.length > 0) {
        throw new ApiConflictException(
          'REBIND',
          `Masih ada ${batch.skipped.length} jawaban yang perlu dikirim ulang dengan id baru`,
        )
      }
      actualCount = batch.confirmedCount
    } else {
      actualCount = await this.sessions.countAnswers(session.id)
    }

    if (
      input.expectedAnswerCount !== undefined &&
      actualCount < input.expectedAnswerCount
    ) {
      throw new ApiConflictException(
        'SHORTFALL',
        `Masih ada jawaban yang belum diterima server (${actualCount}/${input.expectedAnswerCount}), silakan coba lagi`,
      )
    }

    const violations = input.violations ?? 0
    if (violations > 0) {
      await this.sessions.recordViolations(session.id, violations)
    }

    const closed = await this.finalizer.finalize(session.id, 'SUBMITTED', now)
    return {
      status: closed.status,
      submittedAt: closed.submittedAt,
      confirmedAnswerCount: actualCount,
      answersStored: true,
      serverTime: now,
    }
  }
}
