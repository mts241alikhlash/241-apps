import type { FakeExamPackageRepository } from '../../exam-package/application/exam-package.repository.fake.js'
import type { ItemKeyAdjustment } from '../../exam-package/domain/repositories/exam-package.repository.js'
import type { FakeExamRoomRepository } from '../../exam-room/application/exam-room.repository.fake.js'
import type { ExamSession } from '../domain/entities/exam-session.entity.js'
import {
  ISessionRecoveryRepository,
  type RecoveryAuditEntry,
  type RecoveryEffects,
} from '../domain/repositories/session-recovery.port.js'
import type { SessionRecoveryPatch } from '../domain/repositories/exam-session.repository.js'
import type { FakeExamSessionRepository } from './exam-session.repository.fake.js'

export class FakeSessionRecoveryRepository extends ISessionRecoveryRepository {
  constructor(
    private readonly sessions: FakeExamSessionRepository,
    private readonly rooms: FakeExamRoomRepository,
    private readonly packages: FakeExamPackageRepository,
  ) {
    super()
  }

  async recoverOne(
    id: string,
    build: (session: ExamSession) => SessionRecoveryPatch,
    audit: RecoveryAuditEntry,
    effects: RecoveryEffects = {},
  ): Promise<ExamSession | null> {
    const session = this.sessions.sessions.get(id)
    if (session === undefined) return null
    const updated = await this.sessions.applyRecovery(id, build(session))
    if (updated === null) return null
    if (effects.deleteAnswers === true) {
      for (const [answerId, answer] of [...this.sessions.answers]) {
        if (answer.sessionId === id) this.sessions.answers.delete(answerId)
      }
    }
    if (effects.clearAnswerScores === true) {
      for (const [answerId, answer] of [...this.sessions.answers]) {
        if (answer.sessionId === id && answer.gradedById === null) {
          this.sessions.answers.set(answerId, { ...answer, score: null })
        }
      }
    }
    if (effects.deletePublication === true) {
      this.sessions.publications.delete(id)
    }
    await this.auditOf(session, audit)
    return updated
  }

  async recoverRoom(
    roomId: string,
    build: (session: ExamSession) => SessionRecoveryPatch,
    audit: RecoveryAuditEntry,
  ): Promise<ExamSession[]> {
    const seated = (await this.sessions.listByRoom(roomId)).filter(
      (session) => session.status === 'IN_PROGRESS',
    )
    const updated: ExamSession[] = []
    for (const session of seated) {
      const next = await this.sessions.applyRecovery(session.id, build(session))
      if (next === null) continue
      await this.auditOf(session, audit)
      updated.push(next)
    }
    return updated
  }

  async applyRescore(
    sessionId: string,
    result: {
      scores: { answerId: string; score: number | null }[]
      rawScore: number
      maxScore: number
    },
    itemKey?: ItemKeyAdjustment,
  ): Promise<void> {
    if (itemKey !== undefined) await this.packages.adjustItemKey(itemKey)
    const session = this.sessions.sessions.get(sessionId)
    if (session === undefined) return
    for (const { answerId, score } of result.scores) {
      const answer = this.sessions.answers.get(answerId)
      if (answer !== undefined) {
        this.sessions.answers.set(answerId, { ...answer, score })
      }
    }
    this.sessions.sessions.set(sessionId, {
      ...session,
      rawScore: result.rawScore,
      maxScore: result.maxScore,
      updatedAt: new Date(),
    })
    if (this.sessions.publications.has(sessionId)) {
      this.sessions.publications.set(sessionId, 'PENDING')
    }
  }

  private async auditOf(
    session: ExamSession,
    audit: RecoveryAuditEntry,
  ): Promise<void> {
    await this.rooms.writeAuditLog({
      sessionId: session.id,
      roomId: session.roomId,
      scheduleId: session.scheduleId,
      action: audit.action,
      actorId: audit.actorId,
      reason: audit.reason,
      metadata: audit.metadata ?? {},
    })
  }
}
