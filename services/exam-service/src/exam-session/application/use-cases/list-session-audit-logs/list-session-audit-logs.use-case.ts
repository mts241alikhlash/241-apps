import { Injectable, NotFoundException } from '@nestjs/common'
import {
  RoomAccessService,
  type RoomStaffUser,
} from '../../../../exam-room/application/room-access.service.js'
import type { ExamSessionAuditLog } from '../../../../exam-room/domain/entities/exam-session-audit-log.entity.js'
import { IExamRoomRepository } from '../../../../exam-room/domain/repositories/exam-room.repository.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'

@Injectable()
export class ListSessionAuditLogsUseCase {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly sessions: IExamSessionRepository,
    private readonly access: RoomAccessService,
  ) {}

  async execute(
    user: RoomStaffUser,
    sessionId: string,
  ): Promise<ExamSessionAuditLog[]> {
    const session = await this.sessions.findById(sessionId)
    if (session === null) {
      throw new NotFoundException('Sesi ujian tidak ditemukan')
    }
    if (session.roomId === null) {
      await this.access.assertCanActWithoutRoom(user)
    } else {
      await this.access.assertCanView(user, session.roomId)
    }
    return this.rooms.listAuditLogs(sessionId)
  }
}
