import { randomUUID } from 'node:crypto'
import { publicationWaitMs } from '../../exam-grading/application/use-cases/publish-scores/publish-scores.use-case.js'
import type { OfflineResult } from '../domain/entities/offline-result.entity.js'
import {
  IOfflineResultRepository,
  type OfflineResultWrite,
} from '../domain/repositories/offline-result.repository.js'

export class FakeOfflineResultRepository extends IOfflineResultRepository {
  readonly rows = new Map<string, OfflineResult>()

  listBySchedules(scheduleIds: string[]) {
    return Promise.resolve(
      [...this.rows.values()].filter((row) =>
        scheduleIds.includes(row.scheduleId),
      ),
    )
  }

  find(scheduleId: string, studentId: string): OfflineResult | undefined {
    return [...this.rows.values()].find(
      (row) => row.scheduleId === scheduleId && row.studentId === studentId,
    )
  }

  save(input: OfflineResultWrite) {
    const existing = this.find(input.scheduleId, input.studentId)
    const base: OfflineResult = existing ?? {
      id: randomUUID(),
      scheduleId: input.scheduleId,
      studentId: input.studentId,
      rawScore: null,
      note: '',
      enteredById: input.enteredById,
      enteredAt: input.enteredAt,
      updatedAt: input.enteredAt,
      publicationStatus: null,
      publicationAttempts: 0,
      publicationError: null,
      lastAttemptAt: null,
      sentAt: null,
    }
    const row: OfflineResult = {
      ...base,
      rawScore: input.rawScore,
      note: input.note,
      enteredById: input.enteredById,
      enteredAt: input.enteredAt,
      updatedAt: input.enteredAt,
      ...(input.publication
        ? {
            publicationStatus: input.publication.status,
            publicationAttempts: 0,
            publicationError: null,
            lastAttemptAt: null,
          }
        : {}),
    }
    this.rows.set(row.id, row)
    return Promise.resolve(row)
  }

  queue(scheduleId: string, studentIds: string[]) {
    let count = 0
    for (const row of this.rows.values()) {
      if (
        row.scheduleId === scheduleId &&
        studentIds.includes(row.studentId) &&
        row.rawScore !== null &&
        row.publicationStatus !== 'SENT'
      ) {
        this.rows.set(row.id, {
          ...row,
          publicationStatus: 'PENDING',
          publicationAttempts: 0,
          publicationError: null,
          lastAttemptAt: null,
        })
        count += 1
      }
    }
    return Promise.resolve(count)
  }

  findCandidates(now: Date, limit: number, excludeIds: string[]) {
    return Promise.resolve(
      [...this.rows.values()]
        .filter(
          (row) =>
            row.publicationStatus === 'PENDING' &&
            row.rawScore !== null &&
            !excludeIds.includes(row.id) &&
            (row.lastAttemptAt === null ||
              row.lastAttemptAt.getTime() +
                publicationWaitMs(row.publicationAttempts) <=
                now.getTime()),
        )
        .slice(0, limit),
    )
  }

  markSent(id: string, at: Date, enteredAt: Date) {
    const row = this.rows.get(id)
    if (
      row?.publicationStatus === 'PENDING' &&
      row.enteredAt.getTime() === enteredAt.getTime()
    ) {
      this.rows.set(id, {
        ...row,
        publicationStatus: 'SENT',
        sentAt: at,
        lastAttemptAt: at,
        publicationError: null,
      })
    }
    return Promise.resolve()
  }

  markFailed(
    id: string,
    at: Date,
    reason: string,
    permanent: boolean,
    enteredAt: Date,
  ) {
    const row = this.rows.get(id)
    if (
      row?.publicationStatus === 'PENDING' &&
      row.enteredAt.getTime() === enteredAt.getTime()
    ) {
      this.rows.set(id, {
        ...row,
        publicationStatus: permanent ? 'FAILED' : row.publicationStatus,
        publicationAttempts: row.publicationAttempts + 1,
        lastAttemptAt: at,
        publicationError: reason.slice(0, 300),
      })
    }
    return Promise.resolve()
  }
}
