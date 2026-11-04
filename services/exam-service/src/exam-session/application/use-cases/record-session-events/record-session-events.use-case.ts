import { Injectable } from '@nestjs/common'
import type {
  ExamSessionEvent,
  NewExamSessionEvent,
} from '../../../../exam-room/domain/entities/exam-session-event.entity.js'
import { IExamRoomRepository } from '../../../../exam-room/domain/repositories/exam-room.repository.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'
import { SessionAccessService } from '../../session-access.service.js'

export const VIOLATION_LOCK_THRESHOLD = 3
export const ABSENCE_LOCK_MS = 5 * 60 * 1000

export interface RecordSessionEventsInput {
  events: NewExamSessionEvent[]
}

export interface RecordedSessionEvents {
  events: ExamSessionEvent[]
  violationCount: number
  requiresTokenReentry: boolean
  lockedByViolation: boolean
  absentSince: Date | null
  serverTime: Date
}

@Injectable()
export class RecordSessionEventsUseCase {
  constructor(
    private readonly access: SessionAccessService,
    private readonly sessions: IExamSessionRepository,
    private readonly rooms: IExamRoomRepository,
  ) {}

  async execute(
    user: { id: string; deviceId: string },
    sessionId: string,
    input: RecordSessionEventsInput,
    now: Date = new Date(),
  ): Promise<RecordedSessionEvents> {
    const session = await this.access.loadOwned(user, sessionId, now)
    const known = new Set(
      (await this.rooms.listSessionEvents(session.id)).map(
        (row) => row.clientId,
      ),
    )
    const stored = await this.rooms.recordSessionEvents(
      session.id,
      input.events,
    )
    const fresh = stored.filter((row) => !known.has(row.clientId))

    const violations = fresh.filter((event) => event.isViolation).length
    const violationCount = session.violationCount + violations
    const locked =
      session.lockedByViolation || violationCount >= VIOLATION_LOCK_THRESHOLD
    const leftApp = fresh.find((event) => event.type === 'LEFT_APP')
    const reentry = session.requiresTokenReentry || leftApp !== undefined
    const absentSince = leftApp?.occurredAt ?? session.absentSince

    const patched =
      (await this.sessions.applyRecovery(session.id, {
        requiresTokenReentry: reentry,
        lockedByViolation: locked,
        violationCount,
        lastSeenAt: now,
        absentSince,
      })) ?? session

    return {
      events: stored,
      violationCount: patched.violationCount,
      requiresTokenReentry: patched.requiresTokenReentry,
      lockedByViolation: patched.lockedByViolation,
      absentSince: patched.absentSince,
      serverTime: now,
    }
  }
}
