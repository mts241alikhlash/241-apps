import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import type { ExamType } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type {
  ActivityTokenMode,
  ExamDeliveryMode,
  ExamOfflineKind,
} from '../../../domain/entities/exam-activity.entity.js'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'
import {
  DEFAULT_POLICIES,
  type ExamPresetName,
  parsePolicy,
} from '../../../domain/policies/exam-policy.policy.js'
import { assertActivityAllowed } from '../../../domain/policies/activity-rules.policy.js'

const MAX_DURATION_MINUTES = 24 * 60
export const READY_PACKAGE_STATUSES = new Set(['APPROVED', 'LOCKED'])

export async function assertPackageReady(
  activities: ExamActivityRepository,
  packageId: string,
): Promise<void> {
  const packageStatus = await activities.findPackageStatus(packageId)
  if (packageStatus === null) {
    throw new NotFoundException('Paket soal tidak ditemukan')
  }
  if (!READY_PACKAGE_STATUSES.has(packageStatus)) {
    throw new UnprocessableEntityException(
      'Paket soal belum disetujui. Ajukan dan minta persetujuan dulu',
    )
  }
}

export interface CreateActivityCommand {
  actorId: string
  manageAll: boolean
  canManageEvents?: boolean
  semesterId: string
  eventId?: string | null
  gradeId: string
  subjectId: string
  packageId?: string | null
  type: ExamType
  classroomIds: string[]
  presetName?: ExamPresetName
  tokenMode: ActivityTokenMode
  startsAt: Date
  endsAt: Date
  durationMinutes: number
  deliveryMode?: ExamDeliveryMode
  offlineKind?: ExamOfflineKind | null
  maxScore?: number
  autoStatus?: boolean
}

@Injectable()
export class CreateActivityUseCase {
  private readonly logger = new Logger(CreateActivityUseCase.name)

  constructor(
    private readonly activities: ExamActivityRepository,
    private readonly participants: IParticipantNumberPort,
  ) {}

  async execute(command: CreateActivityCommand): Promise<ExamActivity> {
    if (
      command.durationMinutes < 1 ||
      command.durationMinutes > MAX_DURATION_MINUTES
    ) {
      throw new BadRequestException('Durasi kegiatan tidak masuk akal')
    }
    if (command.endsAt.getTime() <= command.startsAt.getTime()) {
      throw new BadRequestException('Jendela kegiatan tidak masuk akal')
    }
    const offline = command.deliveryMode === 'OFFLINE'
    const maxScore = command.maxScore ?? 100
    if (offline) {
      if (!command.offlineKind) {
        throw new BadRequestException('Jenis kegiatan luring wajib dipilih')
      }
      if (command.packageId) {
        throw new BadRequestException(
          'Kegiatan luring tidak memakai paket soal',
        )
      }
      if (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 1000) {
        throw new BadRequestException('Nilai maksimal harus 1 sampai 1000')
      }
    }
    const packageId = command.packageId ?? null
    if (packageId !== null) {
      if (command.classroomIds.length === 0) {
        throw new BadRequestException('Pilih minimal satu kelas')
      }
      await assertPackageReady(this.activities, packageId)
    }
    const presetName = command.presetName ?? command.type
    const event = command.eventId
      ? await this.activities.findEventRef(command.eventId)
      : null
    assertActivityAllowed({
      type: command.type,
      presetName,
      tokenMode: offline ? 'ROTATING' : command.tokenMode,
      manageAll: command.manageAll,
      canManageEvents: command.canManageEvents,
      event,
      eventId: command.eventId ?? null,
      semesterId: command.semesterId,
      startsAt: command.startsAt,
      endsAt: command.endsAt,
    })
    const preset = await this.activities.findPreset(presetName)
    if (preset === null) {
      throw new NotFoundException('Preset kebijakan tidak ditemukan')
    }
    const activity = await this.activities.create({
      activity: {
        semesterId: command.semesterId,
        eventId: command.eventId ?? null,
        gradeId: command.gradeId,
        subjectId: command.subjectId,
        packageId,
        type: command.type,
        tokenMode: offline ? 'STATIC' : command.tokenMode,
        presetId: preset.id,
        policy: parsePolicy(preset.policy, DEFAULT_POLICIES[presetName]),
        startsAt: command.startsAt,
        endsAt: command.endsAt,
        durationMinutes: command.durationMinutes,
        deliveryMode: offline ? 'OFFLINE' : 'ONLINE',
        offlineKind: offline ? command.offlineKind : null,
        ...(offline ? { maxScore } : {}),
        autoStatus: command.autoStatus,
        createdById: command.actorId,
      },
      classroomIds: packageId === null ? [] : command.classroomIds,
      actorId: command.actorId,
    })

    try {
      await this.participants.issueNumbers(command.semesterId)
    } catch (error) {
      this.logger.warn(
        `Participant numbers unavailable for semester ${command.semesterId}: ${(error as Error).message}`,
      )
    }

    return activity
  }
}
