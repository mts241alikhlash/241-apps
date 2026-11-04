import { randomUUID } from 'node:crypto'
import type {
  ExamProctorSnapshot,
  SnapshotKind,
} from '../domain/entities/exam-proctor-snapshot.entity.js'
import {
  IExamProctorSnapshotRepository,
  type NewExamProctorSnapshot,
} from '../domain/repositories/exam-proctor-snapshot.repository.js'

export class FakeExamProctorSnapshotRepository extends IExamProctorSnapshotRepository {
  readonly rows = new Map<string, ExamProctorSnapshot>()

  create(input: NewExamProctorSnapshot) {
    const row: ExamProctorSnapshot = {
      id: input.id ?? randomUUID(),
      ...input,
      createdAt: new Date(),
    }
    this.rows.set(row.id, row)
    return Promise.resolve(row)
  }

  upsertLatest(input: NewExamProctorSnapshot) {
    const existing = [...this.rows.values()].find(
      (row) => row.storageKey === input.storageKey,
    )
    if (existing === undefined) return this.create(input)
    const row: ExamProctorSnapshot = {
      ...existing,
      ...input,
      createdAt: new Date(),
    }
    this.rows.set(row.id, row)
    return Promise.resolve(row)
  }

  listBySession(sessionId: string) {
    return Promise.resolve(
      [...this.rows.values()]
        .filter((row) => row.sessionId === sessionId)
        .sort(
          (a, b) =>
            a.capturedAt.getTime() - b.capturedAt.getTime() ||
            a.id.localeCompare(b.id),
        ),
    )
  }

  findLatest(sessionId: string) {
    const rows = [...this.rows.values()].filter(
      (row) => row.sessionId === sessionId,
    )
    rows.sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() ||
        b.capturedAt.getTime() - a.capturedAt.getTime() ||
        b.id.localeCompare(a.id),
    )
    return Promise.resolve(rows[0] ?? null)
  }

  createEvidenceWithinCap(input: NewExamProctorSnapshot, cap: number) {
    const count = [...this.rows.values()].filter(
      (row) => row.sessionId === input.sessionId && row.kind !== 'LIVE',
    ).length
    if (count >= cap) return Promise.resolve(null)
    return this.create(input)
  }

  findExpired(now: Date, limit: number) {
    return Promise.resolve(
      [...this.rows.values()]
        .filter((row) => row.expiresAt.getTime() <= now.getTime())
        .sort(
          (a, b) =>
            a.expiresAt.getTime() - b.expiresAt.getTime() ||
            a.id.localeCompare(b.id),
        )
        .slice(0, limit),
    )
  }

  deleteMany(ids: string[]) {
    for (const id of ids) this.rows.delete(id)
    return Promise.resolve()
  }

  deleteExpired(ids: string[], now: Date) {
    const removed: ExamProctorSnapshot[] = []
    for (const id of ids) {
      const row = this.rows.get(id)
      if (row !== undefined && row.expiresAt.getTime() <= now.getTime()) {
        this.rows.delete(id)
        removed.push(row)
      }
    }
    return Promise.resolve(removed)
  }

  seed(sessionId: string, kind: SnapshotKind, expiresAt: Date) {
    const row: ExamProctorSnapshot = {
      id: randomUUID(),
      sessionId,
      kind,
      storageKey: `exam-proctor/${sessionId}/evidence/${randomUUID()}.jpg`,
      sizeBytes: 12_000,
      capturedAt: new Date(),
      expiresAt,
      createdAt: new Date(),
    }
    this.rows.set(row.id, row)
    return row
  }
}
