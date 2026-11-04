import { Injectable, Logger } from '@nestjs/common'
import { StorageService } from '../../../../core/storage/storage.service.js'
import type { ExamProctorSnapshot } from '../../../domain/entities/exam-proctor-snapshot.entity.js'
import { IExamProctorSnapshotRepository } from '../../../domain/repositories/exam-proctor-snapshot.repository.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'

export const CLEANUP_BATCH = 200
export const CLEANUP_MAX_ROUNDS = 20

@Injectable()
export class CleanupExpiredSnapshotsUseCase {
  private readonly logger = new Logger(CleanupExpiredSnapshotsUseCase.name)

  constructor(
    private readonly snapshots: IExamProctorSnapshotRepository,
    private readonly sessions: IExamSessionRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(now: Date = new Date()): Promise<{ deletedCount: number }> {
    let deletedCount = 0
    for (let round = 0; round < CLEANUP_MAX_ROUNDS; round += 1) {
      const expired = await this.snapshots.findExpired(now, CLEANUP_BATCH)
      if (expired.length === 0) break

      const removed = await this.snapshots.deleteExpired(
        expired.map((snapshot) => snapshot.id),
        now,
      )
      if (removed.length === 0) break

      const before = deletedCount
      const sessionIds = new Set<string>()
      for (const snapshot of removed) {
        try {
          await this.storage.deleteObject(snapshot.storageKey)
          sessionIds.add(snapshot.sessionId)
          deletedCount += 1
        } catch (error) {
          this.logger.error(
            `Failed to delete snapshot object ${snapshot.storageKey}`,
            error instanceof Error ? error.stack : String(error),
          )
          await this.restore(snapshot)
        }
      }

      const emptied: string[] = []
      for (const sessionId of sessionIds) {
        if ((await this.snapshots.listBySession(sessionId)).length === 0) {
          emptied.push(sessionId)
        }
      }
      await this.sessions.clearLastSnapshotAt(emptied)

      if (deletedCount === before) break
      if (expired.length < CLEANUP_BATCH) break
    }
    return { deletedCount }
  }

  private async restore(snapshot: ExamProctorSnapshot): Promise<void> {
    try {
      await this.snapshots.create({
        id: snapshot.id,
        sessionId: snapshot.sessionId,
        kind: snapshot.kind,
        storageKey: snapshot.storageKey,
        sizeBytes: snapshot.sizeBytes,
        capturedAt: snapshot.capturedAt,
        expiresAt: snapshot.expiresAt,
      })
    } catch (error) {
      this.logger.error(
        `Failed to restore snapshot row ${snapshot.id}`,
        error instanceof Error ? error.stack : String(error),
      )
    }
  }
}
