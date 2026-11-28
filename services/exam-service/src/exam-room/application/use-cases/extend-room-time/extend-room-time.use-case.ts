import { ConflictException, Injectable } from '@nestjs/common'
import {
  RoomAccessService,
  type RoomStaffUser,
} from '../../room-access.service.js'
import type { ExamSession } from '../../../../exam-session/domain/entities/exam-session.entity.js'
import { ISessionRecoveryRepository } from '../../../../exam-session/domain/repositories/session-recovery.port.js'
import { IExamSessionRepository } from '../../../../exam-session/domain/repositories/exam-session.repository.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import {
  assertExtraMinutes,
  assertTotalExtraMinutes,
  assertWithinPastEnd,
  shiftBy,
} from '../../../../exam-session/application/use-cases/extend-session-time/extend-session-time.use-case.js'
import { assertRecoveryReason } from '../../../../exam-session/domain/policies/recovery-reason.policy.js'

@Injectable()
export class ExtendRoomTimeUseCase {
  constructor(
    private readonly recovery: ISessionRecoveryRepository,
    private readonly access: RoomAccessService,
    private readonly sessions: IExamSessionRepository,
    private readonly schedules: IExamScheduleRepository,
  ) {}

  async execute(
    user: RoomStaffUser,
    roomId: string,
    minutes: number,
    reason: string,
  ): Promise<ExamSession[]> {
    const added = assertExtraMinutes(minutes)
    const trimmed = assertRecoveryReason(reason)
    await this.access.assertCanActAsTechnician(user, roomId)
    const running = await this.sessions.listByRoom(roomId)
    for (const session of running) {
      if (session.status !== 'IN_PROGRESS') continue
      assertTotalExtraMinutes(session.extraMinutes + added)
      const schedule = await this.schedules.findById(session.scheduleId)
      if (schedule === null) {
        throw new ConflictException('Jadwal ujian tidak ditemukan')
      }
      assertWithinPastEnd(shiftBy(session, added).deadline, schedule.endsAt)
    }
    return this.recovery.recoverRoom(
      roomId,
      (session) => shiftBy(session, added),
      {
        action: 'EXTEND_TIME',
        actorId: user.id,
        reason: trimmed,
        metadata: { roomId, minutes: added },
      },
    )
  }
}
