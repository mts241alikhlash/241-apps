import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  ScheduleScopeService,
  type ScheduleAccessUser,
} from '../../../../exam-schedule/application/schedule-scope.service.js'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'

@Injectable()
export class UpdateActivityAutoStatusUseCase {
  constructor(
    private readonly activities: ExamActivityRepository,
    @Inject(forwardRef(() => ScheduleScopeService))
    private readonly scheduleScope: ScheduleScopeService,
  ) {}

  async execute(
    actor: ScheduleAccessUser,
    activityId: string,
    autoStatus: boolean,
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
    await scope.assertCanManageActivity({ ...current, classroomIds })
    const updated = await this.activities.updateAutoStatus(
      activityId,
      autoStatus,
      actor.id,
    )
    if (updated === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    return updated
  }
}
