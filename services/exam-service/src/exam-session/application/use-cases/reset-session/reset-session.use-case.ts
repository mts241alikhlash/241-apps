import { randomBytes } from 'node:crypto'
import { ConflictException, Injectable } from '@nestjs/common'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import type { RoomStaffUser } from '../../../../exam-room/application/room-access.service.js'
import type { ExamSession } from '../../../domain/entities/exam-session.entity.js'
import { computeTimes } from '../../../domain/policies/session-times.policy.js'
import { SessionRecoveryService } from '../../session-recovery.service.js'

@Injectable()
export class ResetSessionUseCase {
  constructor(
    private readonly recovery: SessionRecoveryService,
    private readonly schedules: IExamScheduleRepository,
  ) {}

  async execute(
    user: RoomStaffUser,
    sessionId: string,
    reason: string,
    now: Date = new Date(),
  ): Promise<ExamSession> {
    const session = await this.recovery.load(sessionId)
    const schedule = await this.schedules.findById(session.scheduleId)
    if (schedule === null) {
      throw new ConflictException('Jadwal ujian tidak ditemukan')
    }
    if (now.getTime() >= schedule.endsAt.getTime()) {
      throw new ConflictException('Waktu ujian sudah berakhir')
    }
    const { deadline, finalizeAt } = computeTimes({
      startedAt: now,
      durationMinutes: schedule.durationMinutes,
      scheduleEndsAt: schedule.endsAt,
    })
    const answerCount = await this.recovery.countAnswers(session.id)

    return this.recovery.apply(
      user,
      sessionId,
      'RESET_SESSION',
      reason,
      () => ({
        status: 'IN_PROGRESS',
        submittedAt: null,
        gradedAt: null,
        lockedByViolation: false,
        violationCount: 0,
        requiresTokenReentry: true,
        extraMinutes: 0,
        shuffleSeed: randomBytes(16).toString('hex'),
        startedAt: now,
        deadline,
        finalizeAt,
        rawScore: null,
        maxScore: null,
        syncedAnswerCount: 0,
        unsyncedCount: 0,
      }),
      { deleteAnswers: true, deletePublication: true },
      { from: session.status, answerCount },
    )
  }
}
