import { Injectable } from '@nestjs/common'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'
import { FinalizeSessionService } from '../../finalize-session.service.js'

@Injectable()
export class CloseActivitySessionsUseCase {
  constructor(
    private readonly sessions: IExamSessionRepository,
    private readonly finalizer: FinalizeSessionService,
  ) {}

  async execute(
    activityId: string,
    actorId: string,
    now: Date = new Date(),
  ): Promise<number> {
    const ids = await this.sessions.findInProgressIdsByActivity(activityId)
    let closed = 0
    for (const id of ids) {
      const session = await this.finalizer.finalizeIfRunning(
        id,
        'EXPIRED',
        now,
        {
          action: 'CLOSED_BY_ADMIN',
          actorId,
          reason: 'Kegiatan ujian ditutup',
          metadata: { activityId },
        },
      )
      if (session !== null) closed += 1
    }
    return closed
  }
}
