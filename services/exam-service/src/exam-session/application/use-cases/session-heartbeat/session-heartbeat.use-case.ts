import { Injectable } from '@nestjs/common'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'
import { SessionAccessService } from '../../session-access.service.js'

export interface SessionHeartbeat {
  lockedByViolation: boolean
  requiresTokenReentry: boolean
  absentSince: Date | null
  serverTime: Date
}

@Injectable()
export class SessionHeartbeatUseCase {
  constructor(
    private readonly access: SessionAccessService,
    private readonly sessions: IExamSessionRepository,
  ) {}

  async execute(
    user: { id: string; deviceId: string },
    sessionId: string,
    now: Date = new Date(),
  ): Promise<SessionHeartbeat> {
    const session = await this.access.loadOwned(user, sessionId, now)
    if (session.status !== 'IN_PROGRESS') {
      return {
        lockedByViolation: session.lockedByViolation,
        requiresTokenReentry: session.requiresTokenReentry,
        absentSince: session.absentSince,
        serverTime: now,
      }
    }
    const patched =
      (await this.sessions.applyRecovery(session.id, { lastSeenAt: now })) ??
      session
    return {
      lockedByViolation: patched.lockedByViolation,
      requiresTokenReentry: patched.requiresTokenReentry,
      absentSince: patched.absentSince,
      serverTime: now,
    }
  }
}
