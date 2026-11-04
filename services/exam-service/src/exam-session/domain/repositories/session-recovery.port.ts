import type { ItemKeyAdjustment } from '../../../exam-package/domain/repositories/exam-package.repository.js'
import type { SessionAuditAction } from '../../../exam-room/domain/entities/exam-session-audit-log.entity.js'
import type { ExamSession } from '../entities/exam-session.entity.js'
import type { SessionRecoveryPatch } from './exam-session.repository.js'

export interface RecoveryAuditEntry {
  action: SessionAuditAction
  actorId: string
  reason: string
  metadata?: Record<string, unknown>
}

export interface RecoveryEffects {
  deleteAnswers?: boolean
  clearAnswerScores?: boolean
  deletePublication?: boolean
}

export abstract class ISessionRecoveryRepository {
  abstract recoverOne(
    id: string,
    build: (session: ExamSession) => SessionRecoveryPatch,
    audit: RecoveryAuditEntry,
    effects?: RecoveryEffects,
  ): Promise<ExamSession | null>
  abstract recoverRoom(
    roomId: string,
    build: (session: ExamSession) => SessionRecoveryPatch,
    audit: RecoveryAuditEntry,
  ): Promise<ExamSession[]>
  abstract applyRescore(
    sessionId: string,
    result: {
      scores: { answerId: string; score: number | null }[]
      rawScore: number
      maxScore: number
    },
    itemKey?: ItemKeyAdjustment,
  ): Promise<void>
}
