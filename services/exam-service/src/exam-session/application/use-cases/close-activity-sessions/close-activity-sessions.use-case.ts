import { Injectable } from '@nestjs/common'
import { IExamRoomRepository } from '../../../../exam-room/domain/repositories/exam-room.repository.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'
import { FinalizeSessionService } from '../../finalize-session.service.js'

@Injectable()
export class CloseActivitySessionsUseCase {
  constructor(
    private readonly sessions: IExamSessionRepository,
    private readonly finalizer: FinalizeSessionService,
    private readonly rooms: IExamRoomRepository,
  ) {}

  async execute(
    activityId: string,
    actorId: string,
    now: Date = new Date(),
  ): Promise<number> {
    const ids = await this.sessions.findInProgressIdsByActivity(activityId)
    for (const id of ids) {
      await this.finalizer.finalize(id, 'EXPIRED', now)
      await this.rooms.writeAuditLog({
        sessionId: id,
        action: 'CLOSED_BY_ADMIN',
        actorId,
        reason: 'Kegiatan ujian ditutup',
        metadata: { activityId },
      })
    }
    return ids.length
  }
}
