import type {
  ExamProctorSnapshot,
  SnapshotKind,
} from '../entities/exam-proctor-snapshot.entity.js'

export interface NewExamProctorSnapshot {
  id?: string
  sessionId: string
  kind: SnapshotKind
  storageKey: string
  sizeBytes: number
  capturedAt: Date
  expiresAt: Date
}

export abstract class IExamProctorSnapshotRepository {
  abstract create(input: NewExamProctorSnapshot): Promise<ExamProctorSnapshot>
  abstract upsertLatest(
    input: NewExamProctorSnapshot,
  ): Promise<ExamProctorSnapshot>
  abstract listBySession(sessionId: string): Promise<ExamProctorSnapshot[]>
  abstract findLatest(sessionId: string): Promise<ExamProctorSnapshot | null>
  abstract createEvidenceWithinCap(
    input: NewExamProctorSnapshot,
    cap: number,
  ): Promise<ExamProctorSnapshot | null>
  abstract findExpired(now: Date, limit: number): Promise<ExamProctorSnapshot[]>
  abstract deleteMany(ids: string[]): Promise<void>
  abstract deleteExpired(
    ids: string[],
    now: Date,
  ): Promise<ExamProctorSnapshot[]>
}
