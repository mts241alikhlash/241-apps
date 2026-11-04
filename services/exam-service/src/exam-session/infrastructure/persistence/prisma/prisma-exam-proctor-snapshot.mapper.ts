import type { Prisma } from '../../../../generated/prisma/client.js'
import type { ExamProctorSnapshot } from '../../../domain/entities/exam-proctor-snapshot.entity.js'

export type SnapshotRow = Prisma.ExamProctorSnapshotGetPayload<object>

export function toSnapshot(row: SnapshotRow): ExamProctorSnapshot {
  return {
    id: row.id,
    sessionId: row.sessionId,
    kind: row.kind,
    storageKey: row.storageKey,
    sizeBytes: row.sizeBytes,
    capturedAt: row.capturedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  }
}
