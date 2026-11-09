import type { ExamPolicy } from '../../../exam-activity/domain/policies/exam-policy.policy.js'
import type { PaginatedResult } from '@mts241alikhlash/nest-core/domain'
import type {
  AnswerPayload,
  AnswerValue,
} from '../policies/validate-answer-shape.policy.js'
import type {
  ExamAnswerRecord,
  ExamSession,
  ExamSessionStatus,
} from '../entities/exam-session.entity.js'

export interface SaveAnswerInput {
  sessionId: string
  questionId: string
  clientId: string
  answer: AnswerPayload
  receivedAfterDeadline: boolean
}

export interface SaveAnswerBatchItem {
  questionId: string
  answer: AnswerValue
  clientId: string
  receivedAfterDeadline: boolean
}

export interface SessionTelemetryUpdate {
  now: Date
  unsyncedCount?: number
  batteryLevel?: number | null
  isCharging?: boolean | null
  dndGranted?: boolean | null
  lockTaskActive?: boolean | null
  batteryUnrestricted?: boolean | null
}

export interface SkippedAnswerBatchItem {
  questionId: string
  clientId: string
}

export interface SaveAnswersBatchResult {
  saved: ExamAnswerRecord[]
  skipped: SkippedAnswerBatchItem[]
  totalConfirmedCount: number
}

export interface GradeAnswerInput {
  sessionId: string
  questionId: string
  score: number
  note: string | null
  gradedById: string
  at: Date
}

export interface GradeRecompute {
  rawScore: number
  maxScore: number
  pendingManual: number
}

export interface ScheduleSessionCounts {
  sessions: number
  awaitingGrading: number
  graded: number
}

export interface SessionClosure {
  status: 'SUBMITTED' | 'EXPIRED' | 'GRADED'
  submittedAt: Date | null
  gradedAt: Date | null
  rawScore: number
  maxScore: number
  scores: { answerId: string; score: number | null }[]
  publish?: boolean
}

export interface SessionRecoveryPatch {
  requiresTokenReentry?: boolean
  deviceId?: string | null
  releasedAt?: Date | null
  releasedById?: string | null
  lockedByViolation?: boolean
  allowWebClient?: boolean
  allowLateEntry?: boolean
  extraMinutes?: number
  kioskMode?: string
  roomId?: string | null
  seatNumber?: number | null
  deadline?: Date
  finalizeAt?: Date
  status?: ExamSessionStatus
  submittedAt?: Date | null
  gradedAt?: Date | null
  violationCount?: number
  shuffleSeed?: string
  startedAt?: Date
  rawScore?: number | null
  maxScore?: number | null
  lastSeenAt?: Date
  absentSince?: Date | null
}

export interface NewExamSession {
  scheduleId: string
  studentId: string
  userId: string
  deviceId: string
  enrollmentId: string
  shuffleSeed: string
  startedAt: Date
  deadline: Date
  finalizeAt: Date
  roomId?: string | null
  seatNumber?: number | null
  allowWebClient?: boolean
  allowLateEntry?: boolean
  policy?: ExamPolicy | null
}

export abstract class IExamSessionRepository {
  abstract findById(id: string): Promise<ExamSession | null>
  abstract findByScheduleAndStudent(
    scheduleId: string,
    studentId: string,
  ): Promise<ExamSession | null>
  abstract createInitial(input: NewExamSession): Promise<ExamSession | null>
  abstract bindDevice(id: string, deviceId: string): Promise<ExamSession | null>
  abstract findAnswerByClientId(
    sessionId: string,
    clientId: string,
  ): Promise<ExamAnswerRecord | null>
  abstract upsertAnswer(
    input: SaveAnswerInput,
  ): Promise<ExamAnswerRecord | null>
  abstract saveAnswersBatch(
    sessionId: string,
    items: SaveAnswerBatchItem[],
    telemetry: SessionTelemetryUpdate,
  ): Promise<SaveAnswersBatchResult>
  abstract close(
    id: string,
    build: (answers: ExamAnswerRecord[]) => SessionClosure,
  ): Promise<ExamSession | null>
  abstract applyGrade(
    input: GradeAnswerInput,
    recompute: (answers: ExamAnswerRecord[]) => GradeRecompute,
  ): Promise<{ answer: ExamAnswerRecord; session: ExamSession } | null>
  abstract findDueIds(
    now: Date,
    limit: number,
    excludeIds: string[],
  ): Promise<string[]>
  abstract findInProgressIdsByActivity(activityId: string): Promise<string[]>
  abstract findPageBySchedule(
    scheduleId: string,
    page: number,
    limit: number,
    status?: ExamSessionStatus,
  ): Promise<PaginatedResult<ExamSession>>
  abstract recordViolations(id: string, count: number): Promise<void>
  abstract recordSnapshot(id: string, at: Date): Promise<void>
  abstract clearLastSnapshotAt(ids: string[]): Promise<void>
  abstract setCameraBlocked(id: string, reason: string): Promise<void>
  abstract countsBySchedule(
    scheduleIds: string[],
  ): Promise<Map<string, ScheduleSessionCounts>>
  abstract publicationStatuses(
    sessionIds: string[],
  ): Promise<Map<string, 'PENDING' | 'SENT'>>
  abstract countAnswers(sessionId: string): Promise<number>
  abstract listAnswers(sessionId: string): Promise<ExamAnswerRecord[]>
  abstract listByStudentAndSchedules(
    studentId: string,
    scheduleIds: string[],
  ): Promise<ExamSession[]>
  abstract applyRecovery(
    id: string,
    patch: SessionRecoveryPatch,
  ): Promise<ExamSession | null>
  abstract seatSession(
    id: string,
    roomId: string,
    seatNumber: number,
  ): Promise<ExamSession | null>
  abstract listByRoom(roomId: string): Promise<ExamSession[]>
  abstract listByScheduleStatuses(
    scheduleId: string,
    statuses: ExamSessionStatus[],
  ): Promise<ExamSession[]>
}
