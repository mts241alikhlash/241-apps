import { ConflictException, Injectable } from '@nestjs/common'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import type { RoomStaffUser } from '../../../../exam-room/application/room-access.service.js'
import type { ExamSession } from '../../../domain/entities/exam-session.entity.js'
import { SessionRecoveryService } from '../../session-recovery.service.js'

const MS_PER_MINUTE = 60_000

@Injectable()
export class ReopenSessionUseCase {
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
    const closed = session.status !== 'IN_PROGRESS'
    if (!closed && !session.lockedByViolation) {
      throw new ConflictException('Sesi masih berjalan dan tidak perlu dibuka')
    }
    if (closed) await this.assertWithinWindow(session, now)

    return this.recovery.apply(
      user,
      sessionId,
      'REOPEN_SESSION',
      reason,
      () => ({
        status: 'IN_PROGRESS',
        submittedAt: null,
        gradedAt: null,
        lockedByViolation: false,
        violationCount: 0,
        requiresTokenReentry: true,
        rawScore: null,
        maxScore: null,
      }),
      { clearAnswerScores: true, deletePublication: true },
      { from: session.status, lockedByViolation: session.lockedByViolation },
    )
  }

  private async assertWithinWindow(
    session: ExamSession,
    now: Date,
  ): Promise<void> {
    const schedule = await this.schedules.findById(session.scheduleId)
    if (schedule === null) {
      throw new ConflictException('Jadwal ujian tidak ditemukan')
    }
    const windowEnd = Math.max(
      schedule.endsAt.getTime(),
      session.deadline.getTime() + session.extraMinutes * MS_PER_MINUTE,
    )
    if (now.getTime() > windowEnd) {
      throw new ConflictException(
        'Waktu ujian sudah berakhir. Tambah waktu kompensasi lebih dulu',
      )
    }
  }
}
