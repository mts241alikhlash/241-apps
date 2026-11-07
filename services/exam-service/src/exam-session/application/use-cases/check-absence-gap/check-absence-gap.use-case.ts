import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { DEFAULT_POLICIES } from '../../../../exam-activity/domain/policies/exam-policy.policy.js'
import type { ExamSessionEvent } from '../../../../exam-room/domain/entities/exam-session-event.entity.js'
import { IExamRoomRepository } from '../../../../exam-room/domain/repositories/exam-room.repository.js'
import type { ExamSession } from '../../../domain/entities/exam-session.entity.js'
import { evaluateAbsenceGap } from '../../../domain/policies/absence-gap.policy.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'
import { VIOLATION_LOCK_THRESHOLD } from '../record-session-events/record-session-events.use-case.js'

@Injectable()
export class CheckAbsenceGapUseCase {
  constructor(
    private readonly sessions: IExamSessionRepository,
    private readonly rooms: IExamRoomRepository,
  ) {}

  async execute(session: ExamSession, now: Date = new Date()): Promise<void> {
    if (session.status !== 'IN_PROGRESS') return
    const policy = session.policy ?? DEFAULT_POLICIES.UJIAN_KETAT
    const events = await this.rooms.listSessionEvents(session.id)
    const priorGaps = events.filter((row) => row.type === 'ABSENCE_GAP').length
    const evaluation = evaluateAbsenceGap({
      lastSeenAt: session.lastSeenAt,
      now,
      policy,
      priorGaps,
    })
    if (!evaluation.record) return
    await this.rooms.recordSessionEvents(session.id, [
      {
        clientId: randomUUID(),
        type: 'ABSENCE_GAP',
        isViolation: evaluation.countsAsViolation,
        detail: `Hilang ${evaluation.seconds} detik`,
        occurredAt: now,
      } satisfies Pick<
        ExamSessionEvent,
        'clientId' | 'detail' | 'isViolation' | 'occurredAt'
      > & { type: 'ABSENCE_GAP' },
    ])
    const violationCount =
      session.violationCount + (evaluation.countsAsViolation ? 1 : 0)
    await this.sessions.applyRecovery(session.id, {
      requiresTokenReentry:
        session.requiresTokenReentry || evaluation.requireToken,
      lockedByViolation:
        session.lockedByViolation || violationCount >= VIOLATION_LOCK_THRESHOLD,
      violationCount,
      absentSince: evaluation.requireToken ? now : session.absentSince,
    })
  }
}
