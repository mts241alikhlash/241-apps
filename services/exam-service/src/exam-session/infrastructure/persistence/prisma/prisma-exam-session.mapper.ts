import { tryParsePolicy } from '../../../../exam-activity/domain/policies/exam-policy.policy.js'
import type { Prisma } from '../../../../generated/prisma/client.js'
import type {
  ExamAnswerRecord,
  ExamSession,
} from '../../../domain/entities/exam-session.entity.js'
import type { AnswerPayload } from '../../../domain/policies/validate-answer-shape.policy.js'

type SessionRow = Prisma.ExamSessionGetPayload<object>
type AnswerRow = Prisma.ExamAnswerGetPayload<object>

export function toSession(row: SessionRow): ExamSession {
  return {
    id: row.id,
    scheduleId: row.scheduleId,
    studentId: row.studentId,
    userId: row.userId,
    deviceId: row.deviceId,
    enrollmentId: row.enrollmentId,
    shuffleSeed: row.shuffleSeed,
    startedAt: row.startedAt,
    deadline: row.deadline,
    finalizeAt: row.finalizeAt,
    status: row.status,
    submittedAt: row.submittedAt,
    rawScore: row.rawScore,
    maxScore: row.maxScore,
    releasedAt: row.releasedAt,
    releasedById: row.releasedById,
    gradedAt: row.gradedAt,
    violationCount: row.violationCount,
    lastSeenAt: row.lastSeenAt,
    absentSince: row.absentSince,
    roomId: row.roomId,
    seatNumber: row.seatNumber,
    requiresTokenReentry: row.requiresTokenReentry,
    lockedByViolation: row.lockedByViolation,
    allowWebClient: row.allowWebClient,
    allowLateEntry: row.allowLateEntry,
    extraMinutes: row.extraMinutes,
    kioskMode: row.kioskMode,
    syncedAnswerCount: row.syncedAnswerCount,
    unsyncedCount: row.unsyncedCount,
    lastBatteryLevel: row.lastBatteryLevel,
    isCharging: row.isCharging,
    policy: tryParsePolicy(row.policy),
    dndGranted: row.dndGranted,
    lockTaskActive: row.lockTaskActive,
    batteryUnrestricted: row.batteryUnrestricted,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toAnswer(row: AnswerRow): ExamAnswerRecord {
  return {
    id: row.id,
    sessionId: row.sessionId,
    questionId: row.questionId,
    answer: row.answer as unknown as AnswerPayload,
    clientId: row.clientId,
    receivedAfterDeadline: row.receivedAfterDeadline,
    score: row.score,
    gradedById: row.gradedById,
    gradedAt: row.gradedAt,
    gradeNote: row.gradeNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
