import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  ScheduleScopeService,
  type ScheduleAccessUser,
} from '../../../../exam-schedule/application/schedule-scope.service.js'
import type { ExamSchedule } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'

export interface AssignActivityClassroomsCommand {
  actor: ScheduleAccessUser
  activityId: string
  classroomIds: string[]
}

@Injectable()
export class AssignActivityClassroomsUseCase {
  constructor(
    private readonly activities: ExamActivityRepository,
    @Inject(forwardRef(() => ScheduleScopeService))
    private readonly scheduleScope: ScheduleScopeService,
  ) {}

  async execute(
    command: AssignActivityClassroomsCommand,
  ): Promise<ExamSchedule[]> {
    const current = await this.activities.findById(command.activityId)
    if (current === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    const scope = await this.scheduleScope.forUser(command.actor)
    await scope.assertCanManageActivity(current, command.classroomIds)
    if (command.classroomIds.length === 0) {
      throw new BadRequestException('Pilih minimal satu kelas')
    }
    const schedules = await this.activities.assignClassrooms({
      activityId: command.activityId,
      classroomIds: command.classroomIds,
      actorId: command.actor.id,
    })
    if (schedules === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    return schedules
  }
}
