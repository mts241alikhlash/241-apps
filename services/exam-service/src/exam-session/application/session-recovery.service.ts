import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  RoomAccessService,
  type RoomStaffUser,
} from '../../exam-room/application/room-access.service.js'
import type { SessionAuditAction } from '../../exam-room/domain/entities/exam-session-audit-log.entity.js'
import type { ExamSession } from '../domain/entities/exam-session.entity.js'
import { assertRecoveryReason } from '../domain/policies/recovery-reason.policy.js'
import { IExamSessionRepository } from '../domain/repositories/exam-session.repository.js'
import {
  ISessionRecoveryRepository,
  type RecoveryEffects,
} from '../domain/repositories/session-recovery.port.js'
import type { SessionRecoveryPatch } from '../domain/repositories/exam-session.repository.js'

export interface RecoveryRequest {
  sessionId: string
  reason: string
  metadata?: Record<string, unknown>
}

@Injectable()
export class SessionRecoveryService {
  constructor(
    private readonly sessions: IExamSessionRepository,
    private readonly recovery: ISessionRecoveryRepository,
    private readonly roomAccess: RoomAccessService,
  ) {}

  async load(sessionId: string): Promise<ExamSession> {
    const session = await this.sessions.findById(sessionId)
    if (session === null) {
      throw new NotFoundException('Sesi ujian tidak ditemukan')
    }
    return session
  }

  async authorize(user: RoomStaffUser, session: ExamSession): Promise<void> {
    if (session.roomId === null) {
      await this.roomAccess.assertCanActWithoutRoom(user)
      return
    }
    await this.roomAccess.assertCanActAsTechnician(user, session.roomId)
  }

  countAnswers(sessionId: string): Promise<number> {
    return this.sessions.countAnswers(sessionId)
  }

  async apply(
    user: RoomStaffUser,
    sessionId: string,
    action: SessionAuditAction,
    reason: string,
    build: (session: ExamSession) => SessionRecoveryPatch,
    effects?: RecoveryEffects,
    metadata?: Record<string, unknown>,
  ): Promise<ExamSession> {
    const trimmed = assertRecoveryReason(reason)
    const session = await this.load(sessionId)
    await this.authorize(user, session)
    const updated = await this.recovery.recoverOne(
      sessionId,
      build,
      {
        action,
        actorId: user.id,
        reason: trimmed,
        metadata: metadata ?? {},
      },
      effects,
    )
    if (updated === null) {
      throw new ConflictException('Sesi ujian tidak dapat diperbarui')
    }
    return updated
  }
}
