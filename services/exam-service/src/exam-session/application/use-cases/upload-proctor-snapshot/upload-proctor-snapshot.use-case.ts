import { randomUUID } from 'node:crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { StorageService } from '../../../../core/storage/storage.service.js'
import { detectImageType } from '../../../../exam-file/domain/policies/detect-image-type.policy.js'
import type { SnapshotKind } from '../../../domain/entities/exam-proctor-snapshot.entity.js'
import { IExamProctorSnapshotRepository } from '../../../domain/repositories/exam-proctor-snapshot.repository.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'
import {
  SessionAccessService,
  type SessionActor,
} from '../../session-access.service.js'

export const PROCTOR_SNAPSHOT_MAX_BYTES = 1_000_000
export const EVIDENCE_SNAPSHOT_CAP = 12
export const SNAPSHOT_RETENTION_MS = 48 * 60 * 60 * 1000

export function latestSnapshotKey(sessionId: string): string {
  return `exam-proctor/${sessionId}/latest.jpg`
}

export function evidenceSnapshotKey(sessionId: string, id: string): string {
  return `exam-proctor/${sessionId}/evidence/${id}.jpg`
}

export interface UploadProctorSnapshotInput {
  buffer: Buffer
  kind: SnapshotKind
  capturedAt: Date
}

export interface UploadedProctorSnapshot {
  evidenceId: string | null
}

@Injectable()
export class UploadProctorSnapshotUseCase {
  constructor(
    private readonly access: SessionAccessService,
    private readonly sessions: IExamSessionRepository,
    private readonly snapshots: IExamProctorSnapshotRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(
    actor: SessionActor,
    sessionId: string,
    input: UploadProctorSnapshotInput,
    now: Date = new Date(),
  ): Promise<UploadedProctorSnapshot> {
    if (input.buffer.length > PROCTOR_SNAPSHOT_MAX_BYTES) {
      throw new BadRequestException('Ukuran foto maksimal 1 MB')
    }
    if (detectImageType(input.buffer) !== 'image/jpeg') {
      throw new BadRequestException('Foto harus JPEG')
    }

    const session = await this.access.loadOwned(actor, sessionId, now)
    if (session.status !== 'IN_PROGRESS') return { evidenceId: null }

    const latestKey = latestSnapshotKey(session.id)
    const expiresAt = new Date(now.getTime() + SNAPSHOT_RETENTION_MS)
    await this.snapshots.upsertLatest({
      sessionId: session.id,
      kind: 'LIVE',
      storageKey: latestKey,
      sizeBytes: input.buffer.length,
      capturedAt: input.capturedAt,
      expiresAt,
    })
    await this.storage.uploadFile(input.buffer, latestKey, 'image/jpeg')
    await this.sessions.recordSnapshot(session.id, now)

    if (input.kind === 'LIVE') return { evidenceId: null }

    const id = randomUUID()
    const storageKey = evidenceSnapshotKey(session.id, id)
    const created = await this.snapshots.createEvidenceWithinCap(
      {
        id,
        sessionId: session.id,
        kind: input.kind,
        storageKey,
        sizeBytes: input.buffer.length,
        capturedAt: input.capturedAt,
        expiresAt,
      },
      EVIDENCE_SNAPSHOT_CAP,
    )
    if (created === null) return { evidenceId: null }

    try {
      await this.storage.uploadFile(input.buffer, storageKey, 'image/jpeg')
    } catch (error) {
      await this.snapshots.deleteMany([created.id])
      throw error
    }
    return { evidenceId: created.id }
  }
}
