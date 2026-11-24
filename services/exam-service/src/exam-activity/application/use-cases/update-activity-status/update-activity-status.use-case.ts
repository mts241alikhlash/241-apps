import {
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common'
import {
  ScheduleScopeService,
  type ScheduleAccessUser,
} from '../../../../exam-schedule/application/schedule-scope.service.js'
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
    @Optional() private readonly scheduleScope?: ScheduleScopeService,
  ) {}

  async execute(
    actor: string | ScheduleAccessUser,
    activityId: string,
    status: ActivityStatus,
  ): Promise<ExamActivity> {
    const actorId = typeof actor === 'string' ? actor : actor.id
    const current = await this.activities.findById(activityId)
    if (current === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    if (this.scheduleScope && typeof actor !== 'string') {
      const scope = await this.scheduleScope.forUser(actor)
      await scope.assertCanManageActivity(current)
    }
    if (
      current.packageId === null &&
      (status === 'SCHEDULED' || status === 'ACTIVE')
    ) {
      throw new UnprocessableEntityException('Pasang paket soal dulu')
    }
    if (current.status === 'ACTIVE' && status !== 'ACTIVE') {
      await this.closeSessions.execute(activityId, actorId)
    }
    const updated = await this.activities.updateStatus(
      activityId,
      status,
      actorId,
    )
    if (updated === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    return updated
  }
}
