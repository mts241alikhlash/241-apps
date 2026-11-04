import { Injectable } from '@nestjs/common'
import {
  RoomAccessService,
  type RoomStaffUser,
} from '../../room-access.service.js'
import type { ExamSession } from '../../../../exam-session/domain/entities/exam-session.entity.js'
import { ISessionRecoveryRepository } from '../../../../exam-session/domain/repositories/session-recovery.port.js'
import { IExamSessionRepository } from '../../../../exam-session/domain/repositories/exam-session.repository.js'
import {
  assertExtraMinutes,
  assertTotalExtraMinutes,
  shiftBy,
} from '../../../../exam-session/application/use-cases/extend-session-time/extend-session-time.use-case.js'
import { assertRecoveryReason } from '../../../../exam-session/domain/policies/recovery-reason.policy.js'

@Injectable()
export class ExtendRoomTimeUseCase {
  constructor(
    private readonly recovery: ISessionRecoveryRepository,
    private readonly access: RoomAccessService,
    private readonly sessions: IExamSessionRepository,
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
      if (session.status === 'IN_PROGRESS') {
        assertTotalExtraMinutes(session.extraMinutes + added)
      }
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
