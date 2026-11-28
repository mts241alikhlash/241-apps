import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../core/database/prisma.service.js'
import type { Prisma } from '../../../generated/prisma/client.js'
import type { OfflineResult } from '../../domain/entities/offline-result.entity.js'
import {
  IOfflineResultRepository,
  type OfflineResultWrite,
} from '../../domain/repositories/offline-result.repository.js'

const ERROR_MAX = 300

type Row = Prisma.ExamOfflineResultGetPayload<object>

function toResult(row: Row): OfflineResult {
  return {
    id: row.id,
    scheduleId: row.scheduleId,
    studentId: row.studentId,
    rawScore: row.rawScore,
    note: row.note,
    enteredById: row.enteredById,
    enteredAt: row.enteredAt,
    updatedAt: row.updatedAt,
    publicationStatus: row.publicationStatus,
    publicationAttempts: row.publicationAttempts,
    publicationError: row.publicationError,
    lastAttemptAt: row.lastAttemptAt,
    sentAt: row.sentAt,
  }
}

@Injectable()
export class PrismaOfflineResultRepository extends IOfflineResultRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async listBySchedules(scheduleIds: string[]): Promise<OfflineResult[]> {
    if (scheduleIds.length === 0) return []
    const rows = await this.prisma.examOfflineResult.findMany({
      where: { scheduleId: { in: scheduleIds } },
      orderBy: [{ scheduleId: 'asc' }, { id: 'asc' }],
    })
    return rows.map(toResult)
  }

  async save(input: OfflineResultWrite): Promise<OfflineResult> {
    const fields = {
      rawScore: input.rawScore,
      note: input.note,
      enteredById: input.enteredById,
      enteredAt: input.enteredAt,
    }
    const publication = input.publication
      ? {
          publicationStatus: input.publication.status,
          publicationAttempts: 0,
          publicationError: null,
          lastAttemptAt: null,
        }
      : {}
    const row = await this.prisma.examOfflineResult.upsert({
      where: {
        scheduleId_studentId: {
          scheduleId: input.scheduleId,
          studentId: input.studentId,
        },
      },
      create: {
        scheduleId: input.scheduleId,
        studentId: input.studentId,
        ...fields,
        ...publication,
      },
      update: { ...fields, ...publication },
    })
    return toResult(row)
  }

  async queue(scheduleId: string, studentIds: string[]): Promise<number> {
    if (studentIds.length === 0) return 0
    const { count } = await this.prisma.examOfflineResult.updateMany({
      where: {
        scheduleId,
        studentId: { in: studentIds },
        rawScore: { not: null },
        OR: [
          { publicationStatus: null },
          { publicationStatus: { in: ['PENDING', 'FAILED'] } },
        ],
      },
      data: {
        publicationStatus: 'PENDING',
        publicationAttempts: 0,
        publicationError: null,
        lastAttemptAt: null,
      },
    })
    return count
  }

  async findCandidates(
    now: Date,
    limit: number,
    excludeIds: string[],
  ): Promise<OfflineResult[]> {
    const ids = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM exam_offline_results
      WHERE publication_status = 'PENDING'
        AND raw_score IS NOT NULL
        AND id <> ALL(${excludeIds}::uuid[])
        AND (
          last_attempt_at IS NULL
          OR last_attempt_at <= ${now}::timestamp
            - LEAST(power(2, publication_attempts), 60) * interval '1 minute'
        )
      ORDER BY last_attempt_at ASC NULLS FIRST, id ASC
      LIMIT ${limit}
    `
    if (ids.length === 0) return []
    const order = new Map(ids.map((row, index) => [row.id, index]))
    const rows = await this.prisma.examOfflineResult.findMany({
      where: { id: { in: ids.map((row) => row.id) } },
    })
    return rows
      .map(toResult)
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  }

  async markSent(id: string, at: Date, enteredAt: Date): Promise<void> {
    await this.prisma.examOfflineResult.updateMany({
      where: { id, enteredAt, publicationStatus: 'PENDING' },
      data: {
        publicationStatus: 'SENT',
        sentAt: at,
        lastAttemptAt: at,
        publicationError: null,
      },
    })
  }

  async markFailed(
    id: string,
    at: Date,
    reason: string,
    permanent: boolean,
    enteredAt: Date,
  ): Promise<void> {
    await this.prisma.examOfflineResult.updateMany({
      where: { id, enteredAt, publicationStatus: 'PENDING' },
      data: {
        ...(permanent ? { publicationStatus: 'FAILED' as const } : {}),
        publicationAttempts: { increment: 1 },
        lastAttemptAt: at,
        publicationError: reason.slice(0, ERROR_MAX),
      },
    })
  }
}
