import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  RoomAccessService,
  type RoomStaffUser,
} from '../../../../exam-room/application/room-access.service.js'
import type { ExamSession } from '../../../domain/entities/exam-session.entity.js'
import { assertRecoveryReason } from '../../../domain/policies/recovery-reason.policy.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'
import { ISessionRecoveryRepository } from '../../../domain/repositories/session-recovery.port.js'

@Injectable()
export class ReleaseSessionUseCase {
  constructor(
    private readonly sessions: IExamSessionRepository,
    private readonly recovery: ISessionRecoveryRepository,
    private readonly access: RoomAccessService,
  ) {}

  async execute(
    user: RoomStaffUser,
    sessionId: string,
    reason: string,
    now: Date = new Date(),
  ): Promise<ExamSession> {
    const trimmed = assertRecoveryReason(reason)
    const session = await this.sessions.findById(sessionId)
    if (session === null) {
      throw new NotFoundException('Sesi ujian tidak ditemukan')
    }
    if (session.roomId === null) {
      await this.access.assertCanActWithoutRoom(user)
    } else {
      await this.access.assertCanRelease(user, session.roomId, now)
    }
    if (session.status !== 'IN_PROGRESS') {
      throw new ConflictException('Sesi sudah selesai dan tidak bisa dilepas')
    }
    const released = await this.recovery.recoverOne(
      sessionId,
      () => ({
        deviceId: null,
        releasedAt: now,
        releasedById: user.id,
        requiresTokenReentry: true,
      }),
      {
        action: 'RELEASE_DEVICE',
        actorId: user.id,
        reason: trimmed,
        metadata: { roomId: session.roomId },
      },
    )
    if (released === null) {
      throw new ConflictException('Sesi sudah selesai dan tidak bisa dilepas')
    }
    return released
  }
}
