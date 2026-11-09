import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator'
import { EXAM_TYPES } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TOKEN_MODES,
} from '../../../domain/entities/exam-activity.entity.js'
import type { ExamPolicy } from '../../../domain/policies/exam-policy.policy.js'

export const EXAM_PRESET_NAMES = [
  'UJIAN_KETAT',
  'ULANGAN_KELAS',
  'TUGAS',
] as const

export class CreateActivityRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() semesterId!: string

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  eventId?: string

  @ApiProperty({ format: 'uuid' }) @IsUUID() gradeId!: string

  @ApiProperty({ format: 'uuid' }) @IsUUID() subjectId!: string

  @ApiProperty({ format: 'uuid' }) @IsUUID() packageId!: string

  @ApiProperty({ enum: EXAM_TYPES })
  @IsIn([...EXAM_TYPES])
  type!: ExamActivity['type']

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  classroomIds!: string[]

  @ApiProperty({ enum: EXAM_PRESET_NAMES })
  @IsIn([...EXAM_PRESET_NAMES])
  presetName!: (typeof EXAM_PRESET_NAMES)[number]

  @ApiProperty({ enum: ACTIVITY_TOKEN_MODES })
  @IsIn([...ACTIVITY_TOKEN_MODES])
  tokenMode!: ExamActivity['tokenMode']

  @ApiProperty({ format: 'date-time' }) @IsISO8601() startsAt!: string

  @ApiProperty({ format: 'date-time' }) @IsISO8601() endsAt!: string

  @ApiProperty({ minimum: 1, maximum: 1440 })
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes!: number
}

export class UpdateActivityStatusRequestDto {
  @ApiProperty({ enum: ACTIVITY_STATUSES })
  @IsIn([...ACTIVITY_STATUSES])
  status!: (typeof ACTIVITY_STATUSES)[number]
}

export class IssueParticipantNumbersResponseDto {
  @ApiProperty() issued!: boolean

  static of(issued: boolean): IssueParticipantNumbersResponseDto {
    const dto = new IssueParticipantNumbersResponseDto()
    dto.issued = issued
    return dto
  }
}

export class UpdateActivityPolicyRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  violationLimit?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(3_000)
  @Max(60_000)
  focusThresholdMs?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(10_000)
  @Max(300_000)
  snapshotIntervalMs?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(10_000)
  @Max(120_000)
  heartbeatIntervalMs?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(30_000)
  @Max(600_000)
  gapRecordedMs?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(30_000)
  @Max(3_600_000)
  gapTokenMs?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  gapViolationFrom?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(3_600)
  tokenSlotSeconds?: number
}

export class ExamPolicyDto implements ExamPolicy {
  @ApiProperty() violationLimit!: number
  @ApiProperty() focusThresholdMs!: number
  @ApiProperty() snapshotIntervalMs!: number
  @ApiProperty() heartbeatIntervalMs!: number
  @ApiProperty() gapRecordedMs!: number
  @ApiProperty() gapTokenMs!: number
  @ApiProperty() gapViolationFrom!: number
  @ApiProperty() tokenSlotSeconds!: number
}

export class ExamActivityDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ format: 'uuid' }) semesterId!: string
  @ApiProperty({ format: 'uuid', nullable: true }) eventId!: string | null
  @ApiProperty({ format: 'uuid' }) gradeId!: string
  @ApiProperty({ format: 'uuid' }) subjectId!: string
  @ApiProperty({ format: 'uuid' }) packageId!: string
  @ApiProperty() type!: string
  @ApiProperty() tokenMode!: string
  @ApiProperty() tokenRotation!: number
  @ApiProperty({ type: ExamPolicyDto }) policy!: ExamPolicyDto
  @ApiProperty({ format: 'date-time' }) startsAt!: string
  @ApiProperty({ format: 'date-time' }) endsAt!: string
  @ApiProperty() durationMinutes!: number
  @ApiProperty() status!: string

  static of(activity: ExamActivity): ExamActivityDto {
    const dto = new ExamActivityDto()
    dto.id = activity.id
    dto.semesterId = activity.semesterId
    dto.eventId = activity.eventId
    dto.gradeId = activity.gradeId
    dto.subjectId = activity.subjectId
    dto.packageId = activity.packageId
    dto.type = activity.type
    dto.tokenMode = activity.tokenMode
    dto.tokenRotation = activity.tokenRotation
    dto.policy = { ...activity.policy }
    dto.startsAt = activity.startsAt.toISOString()
    dto.endsAt = activity.endsAt.toISOString()
    dto.durationMinutes = activity.durationMinutes
    dto.status = activity.status
    return dto
  }
}
