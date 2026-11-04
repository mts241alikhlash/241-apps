import { Injectable, NotFoundException } from '@nestjs/common'
import type { Readable } from 'node:stream'
import { StorageService } from '../../../../core/storage/storage.service.js'
import {
  RoomAccessService,
  type RoomStaffUser,
} from '../../../../exam-room/application/room-access.service.js'
import type { ExamProctorSnapshot } from '../../../domain/entities/exam-proctor-snapshot.entity.js'
import type { ExamSession } from '../../../domain/entities/exam-session.entity.js'
import { IExamProctorSnapshotRepository } from '../../../domain/repositories/exam-proctor-snapshot.repository.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'

export interface ProctorSnapshotStream {
  snapshot: ExamProctorSnapshot
  stream: Readable
  contentLength: number
}

@Injectable()
export class GetProctorSnapshotUseCase {
  constructor(
    private readonly sessions: IExamSessionRepository,
    private readonly snapshots: IExamProctorSnapshotRepository,
    private readonly storage: StorageService,
    private readonly access: RoomAccessService,
  ) {}

  async execute(
    user: RoomStaffUser,
    sessionId: string,
    snapshotId: string,
  ): Promise<ProctorSnapshotStream> {
    const session = await this.sessions.findById(sessionId)
    if (session === null) {
      throw new NotFoundException('Sesi ujian tidak ditemukan')
    }
    await this.authorize(user, session)

    const snapshot =
      snapshotId === 'latest'
        ? await this.snapshots.findLatest(sessionId)
        : ((await this.snapshots.listBySession(sessionId)).find(
            (row) => row.id === snapshotId,
          ) ?? null)
    if (snapshot === null) {
      throw new NotFoundException('Foto tidak ditemukan')
    }

    const { stream, contentLength } = await this.storage.getObject(
      snapshot.storageKey,
    )
    return {
      snapshot,
      stream,
      contentLength: contentLength ?? snapshot.sizeBytes,
    }
  }

  private async authorize(
    user: RoomStaffUser,
    session: ExamSession,
  ): Promise<void> {
    if (session.roomId === null) {
      await this.access.assertCanActWithoutRoom(user)
      return
    }
    await this.access.assertCanView(user, session.roomId)
  }
}
