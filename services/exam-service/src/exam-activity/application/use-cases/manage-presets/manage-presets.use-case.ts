import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import {
  EXAM_TYPES,
  type ExamType,
} from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import {
  DEFAULT_POLICIES,
  parsePolicy,
} from '../../../domain/policies/exam-policy.policy.js'
import {
  ExamActivityRepository,
  type PolicyPresetRecord,
} from '../../../domain/repositories/exam-activity.repository.js'

@Injectable()
export class ManagePresetsUseCase {
  private readonly logger = new Logger(ManagePresetsUseCase.name)

  constructor(private readonly activities: ExamActivityRepository) {}

  async list(): Promise<PolicyPresetRecord[]> {
    return this.activities.listPresets()
  }

  async update(
    actorId: string,
    type: string,
    patch: unknown,
  ): Promise<PolicyPresetRecord> {
    if (!EXAM_TYPES.includes(type as ExamType)) {
      throw new BadRequestException('Jenis kegiatan tidak dikenal')
    }
    const examType = type as ExamType
    const current = await this.activities.findPreset(examType)
    if (current === null) {
      throw new NotFoundException('Preset kebijakan tidak ditemukan')
    }
    const before = parsePolicy(current.policy, DEFAULT_POLICIES[examType])
    const after = parsePolicy(patch, before)
    const updated = await this.activities.updatePreset(examType, after)
    if (updated === null) {
      throw new NotFoundException('Preset kebijakan tidak ditemukan')
    }
    this.logger.log(
      JSON.stringify({
        action: 'UPDATE_PRESET_POLICY',
        actorId,
        type: examType,
        before,
        after,
      }),
    )
    return updated
  }
}
