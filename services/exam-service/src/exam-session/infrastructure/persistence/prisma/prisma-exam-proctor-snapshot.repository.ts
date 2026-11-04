import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import {
  IExamProctorSnapshotRepository,
  type NewExamProctorSnapshot,
} from '../../../domain/repositories/exam-proctor-snapshot.repository.js'
import type { ExamProctorSnapshot } from '../../../domain/entities/exam-proctor-snapshot.entity.js'
import {
  toSnapshot,
  type SnapshotRow,
} from './prisma-exam-proctor-snapshot.mapper.js'

@Injectable()
export class PrismaExamProctorSnapshotRepository extends IExamProctorSnapshotRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async create(input: NewExamProctorSnapshot): Promise<ExamProctorSnapshot> {
    const row = await this.prisma.examProctorSnapshot.create({ data: input })
    return toSnapshot(row)
  }

  async upsertLatest(
    input: NewExamProctorSnapshot,
  ): Promise<ExamProctorSnapshot> {
    const row = await this.prisma.examProctorSnapshot.upsert({
      where: { storageKey: input.storageKey },
      create: input,
      update: {
        kind: input.kind,
        sizeBytes: input.sizeBytes,
        capturedAt: input.capturedAt,
        expiresAt: input.expiresAt,
        createdAt: new Date(),
      },
    })
    return toSnapshot(row)
  }

  async createEvidenceWithinCap(
    input: NewExamProctorSnapshot,
    cap: number,
  ): Promise<ExamProctorSnapshot | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM exam_sessions WHERE id = ${input.sessionId}::uuid FOR UPDATE`
      const count = await tx.examProctorSnapshot.count({
        where: { sessionId: input.sessionId, kind: { not: 'LIVE' } },
      })
      if (count >= cap) return null
      const row = await tx.examProctorSnapshot.create({ data: input })
      return toSnapshot(row)
    })
  }

  async listBySession(sessionId: string): Promise<ExamProctorSnapshot[]> {
    const rows = await this.prisma.examProctorSnapshot.findMany({
      where: { sessionId },
      orderBy: [{ capturedAt: 'asc' }, { id: 'asc' }],
    })
    return rows.map(toSnapshot)
  }

  async findLatest(sessionId: string): Promise<ExamProctorSnapshot | null> {
    const row = await this.prisma.examProctorSnapshot.findFirst({
      where: { sessionId },
      orderBy: [{ createdAt: 'desc' }, { capturedAt: 'desc' }, { id: 'desc' }],
    })
    return row ? toSnapshot(row) : null
  }

  async findExpired(now: Date, limit: number): Promise<ExamProctorSnapshot[]> {
    const rows = await this.prisma.examProctorSnapshot.findMany({
      where: { expiresAt: { lte: now } },
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
      take: limit,
    })
    return rows.map(toSnapshot)
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await this.prisma.examProctorSnapshot.deleteMany({
      where: { id: { in: ids } },
    })
  }

  async deleteExpired(
    ids: string[],
    now: Date,
  ): Promise<ExamProctorSnapshot[]> {
    if (ids.length === 0) return []
    const rows = await this.prisma.$queryRaw<SnapshotRow[]>`
      DELETE FROM exam_proctor_snapshots
      WHERE id = ANY(${ids}::uuid[]) AND expires_at <= ${now}::timestamp
      RETURNING id, session_id AS "sessionId", kind, storage_key AS "storageKey",
        size_bytes AS "sizeBytes", captured_at AS "capturedAt",
        expires_at AS "expiresAt", created_at AS "createdAt"
    `
    return rows.map(toSnapshot)
  }
}
