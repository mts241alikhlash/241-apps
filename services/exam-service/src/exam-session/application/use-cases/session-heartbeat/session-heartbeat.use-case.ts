import { CheckAbsenceGapUseCase } from '../check-absence-gap/check-absence-gap.use-case.js'
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
    private readonly absence: CheckAbsenceGapUseCase,
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
    await this.absence.execute(session, now)
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
