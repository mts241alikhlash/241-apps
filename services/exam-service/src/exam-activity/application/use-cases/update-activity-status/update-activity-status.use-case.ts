import { Injectable, NotFoundException } from '@nestjs/common'
import type {
  ActivityStatus,
  ExamActivity,
} from '../../../domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import { CloseActivitySessionsUseCase } from '../../../../exam-session/application/use-cases/close-activity-sessions/close-activity-sessions.use-case.js'

@Injectable()
export class UpdateActivityStatusUseCase {
  constructor(
    private readonly activities: ExamActivityRepository,
    private readonly closeSessions: CloseActivitySessionsUseCase,
  ) {}

  async execute(
    actorId: string,
    activityId: string,
    status: ActivityStatus,
  ): Promise<ExamActivity> {
    const current = await this.activities.findById(activityId)
    if (current === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    const updated = await this.activities.updateStatus(
      activityId,
      status,
      actorId,
    )
    if (updated === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    if (current.status === 'ACTIVE' && status !== 'ACTIVE') {
      await this.closeSessions.execute(activityId, actorId)
    }
    return updated
  }
}
