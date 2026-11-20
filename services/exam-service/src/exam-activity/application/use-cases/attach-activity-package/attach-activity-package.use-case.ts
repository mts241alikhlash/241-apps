import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import { ApiConflictException } from '../../../../core/filters/api-exception.js'
import { assertPackageReady } from '../create-activity/create-activity.use-case.js'

export interface AttachActivityPackageCommand {
  actorId: string
  activityId: string
  packageId: string
  classroomIds: string[]
}

@Injectable()
export class AttachActivityPackageUseCase {
  constructor(private readonly activities: ExamActivityRepository) {}

  async execute(command: AttachActivityPackageCommand): Promise<ExamActivity> {
    const current = await this.activities.findById(command.activityId)
    if (current === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
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
    const updated = await this.activities.attachPackage(command)
    if (updated === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    return updated
  }
}
