import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import { parsePolicy } from '../../../domain/policies/exam-policy.policy.js'

@Injectable()
export class UpdateActivityPolicyUseCase {
  constructor(private readonly activities: ExamActivityRepository) {}

  async execute(
    actorId: string,
    activityId: string,
    patch: unknown,
  ): Promise<ExamActivity> {
    const activity = await this.activities.findById(activityId)
    if (activity === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    if (activity.status === 'ACTIVE') {
      throw new ConflictException(
        'Kebijakan kegiatan yang sedang berjalan tidak boleh diubah',
      )
    }
    const policy = parsePolicy(patch, activity.policy)
    const updated = await this.activities.updatePolicy(
      activityId,
      policy,
      actorId,
    )
    if (updated === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    return updated
  }
}

@Injectable()
export class RotateActivityTokenUseCase {
  constructor(private readonly activities: ExamActivityRepository) {}

  async execute(actorId: string, activityId: string): Promise<ExamActivity> {
    const rotated = await this.activities.rotateToken(activityId, actorId)
    if (rotated === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    return rotated
  }
}
