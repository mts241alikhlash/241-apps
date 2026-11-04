export const SNAPSHOT_KINDS = [
  'LIVE',
  'SESSION_START',
  'VIOLATION_RETURN',
  'PERIODIC_EVIDENCE',
] as const

export type SnapshotKind = (typeof SNAPSHOT_KINDS)[number]

export interface ExamProctorSnapshot {
  id: string
  sessionId: string
  kind: SnapshotKind
  storageKey: string
  sizeBytes: number
  capturedAt: Date
  expiresAt: Date
  createdAt: Date
}
