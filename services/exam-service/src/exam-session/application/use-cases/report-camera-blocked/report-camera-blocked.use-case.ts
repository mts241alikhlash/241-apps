import { Injectable } from '@nestjs/common'
import {
  SessionAccessService,
  type SessionActor,
} from '../../session-access.service.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'

export const CAMERA_BLOCKED_REASONS = [
  'network',
  'permission',
  'battery',
  'stopped',
  'hardware',
  'cameraBusy',
] as const

export type CameraBlockedReason = (typeof CAMERA_BLOCKED_REASONS)[number]

@Injectable()
export class ReportCameraBlockedUseCase {
  constructor(
    private readonly access: SessionAccessService,
    private readonly sessions: IExamSessionRepository,
  ) {}

  async execute(
    actor: SessionActor,
    sessionId: string,
    reason: CameraBlockedReason,
    now: Date = new Date(),
  ): Promise<void> {
    const session = await this.access.loadOwned(actor, sessionId, now)
    if (session.status !== 'IN_PROGRESS') return
    await this.sessions.setCameraBlocked(session.id, reason)
  }
}
