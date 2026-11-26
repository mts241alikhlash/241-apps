import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
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
    @Inject(forwardRef(() => ScheduleScopeService))
    private readonly scheduleScope: ScheduleScopeService,
  ) {}

  async execute(
    actor: ScheduleAccessUser,
    activityId: string,
    status: ActivityStatus,
  ): Promise<ExamActivity> {
    const current = await this.activities.findById(activityId)
    if (current === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    const scope = await this.scheduleScope.forUser(actor)
    const classroomIds = scope.allManage
      ? undefined
      : (await this.activities.listSchedules(activityId)).map(
          (row) => row.classroomId,
        )
    await scope.assertCanManageActivity({
      ...current,
      classroomIds,
    })
    if (
      current.deliveryMode === 'ONLINE' &&
      current.packageId === null &&
      status === 'ACTIVE'
    ) {
      throw new UnprocessableEntityException('Pasang paket soal dulu')
    }
    if (current.status === 'ACTIVE' && status !== 'ACTIVE') {
      await this.closeSessions.execute(activityId, actor.id)
    }
    const updated = await this.activities.updateStatus(
      activityId,
      status,
      actor.id,
    )
    if (updated === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    return updated
  }
}
