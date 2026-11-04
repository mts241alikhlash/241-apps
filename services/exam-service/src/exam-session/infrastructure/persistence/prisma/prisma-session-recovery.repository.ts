import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { Prisma } from '../../../../generated/prisma/client.js'
import type { ItemKeyAdjustment } from '../../../../exam-package/domain/repositories/exam-package.repository.js'
import type { ExamSession } from '../../../domain/entities/exam-session.entity.js'
import type { SessionRecoveryPatch } from '../../../domain/repositories/exam-session.repository.js'
import {
  ISessionRecoveryRepository,
  type RecoveryAuditEntry,
  type RecoveryEffects,
} from '../../../domain/repositories/session-recovery.port.js'
import { toSession } from './prisma-exam-session.mapper.js'

@Injectable()
export class PrismaSessionRecoveryRepository extends ISessionRecoveryRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  recoverOne(
    id: string,
    build: (session: ExamSession) => SessionRecoveryPatch,
    audit: RecoveryAuditEntry,
    effects: RecoveryEffects = {},
  ): Promise<ExamSession | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.examSession.findUnique({ where: { id } })
      if (existing === null) return null
      const patch = build(toSession(existing))
      const updated = await tx.examSession.update({
        where: { id },
        data: patch,
      })
      if (effects.deleteAnswers === true) {
        await tx.examAnswer.deleteMany({ where: { sessionId: id } })
      }
      if (effects.clearAnswerScores === true) {
        await tx.examAnswer.updateMany({
          where: { sessionId: id, gradedById: null },
          data: { score: null },
        })
      }
      if (effects.deletePublication === true) {
        await tx.scorePublication.deleteMany({ where: { sessionId: id } })
      }
      await tx.examSessionAuditLog.create({
        data: {
          sessionId: id,
          roomId: updated.roomId,
          scheduleId: updated.scheduleId,
          action: audit.action,
          actorId: audit.actorId,
          reason: audit.reason,
          metadata: (audit.metadata ?? {}) as Prisma.InputJsonValue,
        },
      })
      return toSession(updated)
    })
  }

  recoverRoom(
    roomId: string,
    build: (session: ExamSession) => SessionRecoveryPatch,
    audit: RecoveryAuditEntry,
  ): Promise<ExamSession[]> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.examSession.findMany({
        where: { roomId, status: 'IN_PROGRESS' },
        orderBy: { seatNumber: 'asc' },
      })
      const updated: ExamSession[] = []
      for (const row of rows) {
        const next = await tx.examSession.update({
          where: { id: row.id },
          data: build(toSession(row)),
        })
        await tx.examSessionAuditLog.create({
          data: {
            sessionId: next.id,
            roomId: next.roomId,
            scheduleId: next.scheduleId,
            action: audit.action,
            actorId: audit.actorId,
            reason: audit.reason,
            metadata: (audit.metadata ?? {}) as Prisma.InputJsonValue,
          },
        })
        updated.push(toSession(next))
      }
      return updated
    })
  }

  applyRescore(
    sessionId: string,
    result: {
      scores: { answerId: string; score: number | null }[]
      rawScore: number
      maxScore: number
    },
    itemKey?: ItemKeyAdjustment,
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      if (itemKey !== undefined) {
        await tx.examPackageItem.update({
          where: {
            packageId_questionId: {
              packageId: itemKey.packageId,
              questionId: itemKey.questionId,
            },
          },
          data: {
            resolution: itemKey.resolution,
            overrideContent: itemKey.overrideContent as
              Prisma.InputJsonValue | undefined,
            adjustedById: itemKey.adjustedById,
            adjustedReason: itemKey.adjustedReason,
            adjustedAt: itemKey.adjustedAt,
          },
        })
      }
      for (const { answerId, score } of result.scores) {
        await tx.examAnswer.update({
          where: { id: answerId },
          data: { score },
        })
      }
      await tx.examSession.update({
        where: { id: sessionId },
        data: { rawScore: result.rawScore, maxScore: result.maxScore },
      })
      await tx.scorePublication.updateMany({
        where: { sessionId },
        data: {
          status: 'PENDING',
          attempts: 0,
          permanentFailures: 0,
          lastError: null,
          lastAttemptAt: null,
          sentAt: null,
        },
      })
    })
  }
}
