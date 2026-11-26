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
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import { ApiConflictException } from '../../../../core/filters/api-exception.js'
import { assertPackageReady } from '../create-activity/create-activity.use-case.js'

export interface AttachActivityPackageCommand {
  actor: ScheduleAccessUser
  activityId: string
  packageId: string
  classroomIds: string[]
}

@Injectable()
export class AttachActivityPackageUseCase {
  constructor(
    private readonly activities: ExamActivityRepository,
    @Inject(forwardRef(() => ScheduleScopeService))
    private readonly scheduleScope: ScheduleScopeService,
  ) {}

  async execute(command: AttachActivityPackageCommand): Promise<ExamActivity> {
    const current = await this.activities.findById(command.activityId)
    if (current === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    const scope = await this.scheduleScope.forUser(command.actor)
    await scope.assertCanManageActivity(current, command.classroomIds)
    if (current.deliveryMode === 'OFFLINE') {
      throw new ApiConflictException(
        'OFFLINE_NO_PACKAGE',
        'Kegiatan luring tidak memakai paket soal',
      )
    }
    if (current.packageId !== null) {
      throw new ApiConflictException(
        'ACTIVITY_HAS_PACKAGE',
        'Kegiatan sudah memiliki paket soal',
      )
    }
    await assertPackageReady(this.activities, command.packageId)
    if (command.classroomIds.length === 0) {
      throw new BadRequestException('Pilih minimal satu kelas')
    }
    const updated = await this.activities.attachPackage({
      activityId: command.activityId,
      packageId: command.packageId,
      classroomIds: command.classroomIds,
      actorId: command.actor.id,
    })
    if (updated === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    return updated
  }
}
