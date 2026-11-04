import { Injectable, NotFoundException } from '@nestjs/common'
import {
  RoomAccessService,
  type RoomStaffUser,
} from '../../../../exam-room/application/room-access.service.js'
import type { ExamProctorSnapshot } from '../../../domain/entities/exam-proctor-snapshot.entity.js'
import { IExamProctorSnapshotRepository } from '../../../domain/repositories/exam-proctor-snapshot.repository.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'

@Injectable()
export class ListSessionSnapshotsUseCase {
  constructor(
    private readonly sessions: IExamSessionRepository,
    private readonly snapshots: IExamProctorSnapshotRepository,
    private readonly access: RoomAccessService,
  ) {}

  async execute(
    user: RoomStaffUser,
    sessionId: string,
  ): Promise<ExamProctorSnapshot[]> {
    const session = await this.sessions.findById(sessionId)
    if (session === null) {
      throw new NotFoundException('Sesi ujian tidak ditemukan')
    }
    if (session.roomId === null) {
      await this.access.assertCanActWithoutRoom(user)
    } else {
      await this.access.assertCanView(user, session.roomId)
    }
    return (await this.snapshots.listBySession(sessionId)).filter(
      (row) => row.kind !== 'LIVE',
    )
  }
}
