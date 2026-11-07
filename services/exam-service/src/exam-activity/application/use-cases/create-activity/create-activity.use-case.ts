import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { ExamType } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type { ActivityTokenMode } from '../../../domain/entities/exam-activity.entity.js'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import {
  DEFAULT_POLICIES,
  type ExamPresetName,
  parsePolicy,
} from '../../../domain/policies/exam-policy.policy.js'

const MAX_DURATION_MINUTES = 24 * 60

export interface CreateActivityCommand {
  actorId: string
  semesterId: string
  eventId?: string | null
  gradeId: string
  subjectId: string
  packageId: string
  type: ExamType
  classroomIds: string[]
  presetName: ExamPresetName
  tokenMode: ActivityTokenMode
  startsAt: Date
  endsAt: Date
  durationMinutes: number
}

@Injectable()
export class CreateActivityUseCase {
  constructor(private readonly activities: ExamActivityRepository) {}

  async execute(command: CreateActivityCommand): Promise<ExamActivity> {
    if (command.classroomIds.length === 0) {
      throw new BadRequestException('Pilih minimal satu kelas')
    }
    if (
      command.durationMinutes < 1 ||
      command.durationMinutes > MAX_DURATION_MINUTES
    ) {
      throw new BadRequestException('Durasi kegiatan tidak masuk akal')
    }
    if (command.endsAt.getTime() <= command.startsAt.getTime()) {
      throw new BadRequestException('Jendela kegiatan tidak masuk akal')
    }
    const preset = await this.activities.findPreset(command.presetName)
    if (preset === null) {
      throw new NotFoundException('Preset kebijakan tidak ditemukan')
    }
    return this.activities.create({
      activity: {
        semesterId: command.semesterId,
        eventId: command.eventId ?? null,
        gradeId: command.gradeId,
        subjectId: command.subjectId,
        packageId: command.packageId,
        type: command.type,
        tokenMode: command.tokenMode,
        presetId: preset.id,
        policy: parsePolicy(
          preset.policy,
          DEFAULT_POLICIES[command.presetName],
        ),
        startsAt: command.startsAt,
        endsAt: command.endsAt,
        durationMinutes: command.durationMinutes,
        createdById: command.actorId,
      },
      classroomIds: command.classroomIds,
      actorId: command.actorId,
    })
  }
}
