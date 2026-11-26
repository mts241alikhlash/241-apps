import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator'
import {
  EXAM_CATEGORIES,
  EXAM_TYPES,
  type ExamCategory,
  type ExamType,
} from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { categoryOf } from '../../../../exam-schedule/domain/policies/exam-category.policy.js'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TOKEN_MODES,
  EXAM_DELIVERY_MODES,
  EXAM_OFFLINE_KINDS,
} from '../../../domain/entities/exam-activity.entity.js'
import type { ExamPolicy } from '../../../domain/policies/exam-policy.policy.js'

export const EXAM_PRESET_NAMES = EXAM_TYPES

export class CreateActivityRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() semesterId!: string

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  eventId?: string

  @ApiProperty({ format: 'uuid' }) @IsUUID() gradeId!: string

  @ApiProperty({ format: 'uuid' }) @IsUUID() subjectId!: string

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  packageId?: string | null

  @ApiProperty({ enum: EXAM_TYPES })
  @IsIn([...EXAM_TYPES])
  type!: ExamActivity['type']

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  classroomIds?: string[]

  @ApiPropertyOptional({ enum: EXAM_PRESET_NAMES })
  @IsOptional()
  @IsIn([...EXAM_PRESET_NAMES])
  presetName?: (typeof EXAM_PRESET_NAMES)[number]

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

  @ApiPropertyOptional({ enum: EXAM_DELIVERY_MODES, default: 'ONLINE' })
  @IsOptional()
  @IsIn([...EXAM_DELIVERY_MODES])
  deliveryMode?: ExamActivity['deliveryMode']

  @ApiPropertyOptional({ enum: EXAM_OFFLINE_KINDS, nullable: true })
  @IsOptional()
  @IsIn([...EXAM_OFFLINE_KINDS])
  offlineKind?: ExamActivity['offlineKind']

  @ApiPropertyOptional({ minimum: 1, maximum: 1000, default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxScore?: number

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoStatus?: boolean
}

export class AssignActivityClassroomsRequestDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  classroomIds!: string[]
}

export class AttachActivityPackageRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() packageId!: string

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  classroomIds!: string[]
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  lateToleranceMinutes?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  minSubmitMinutes?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  autoOpenLeadMinutes?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  autoCloseGraceMinutes?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shuffleChoices?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowWeb?: boolean
}

export class ExamPolicyDto implements ExamPolicy {
  @ApiProperty() violationLimit!: number
  @ApiProperty() focusThresholdMs!: number
  @ApiProperty() heartbeatIntervalMs!: number
  @ApiProperty() gapRecordedMs!: number
  @ApiProperty() gapTokenMs!: number
  @ApiProperty() gapViolationFrom!: number
  @ApiProperty() tokenSlotSeconds!: number
  @ApiProperty() lateToleranceMinutes!: number
  @ApiProperty() minSubmitMinutes!: number
  @ApiProperty() autoOpenLeadMinutes!: number
  @ApiProperty() autoCloseGraceMinutes!: number
  @ApiProperty() shuffleQuestions!: boolean
  @ApiProperty() shuffleChoices!: boolean
  @ApiProperty() allowWeb!: boolean
}

export class ExamActivityQueryDto {
  @ApiPropertyOptional({ enum: EXAM_CATEGORIES })
  @IsOptional()
  @IsIn([...EXAM_CATEGORIES])
  category?: ExamCategory
}

export class ExamActivityDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ format: 'uuid' }) semesterId!: string
  @ApiProperty({ format: 'uuid', nullable: true }) eventId!: string | null
  @ApiProperty({ format: 'uuid' }) gradeId!: string
  @ApiProperty({ format: 'uuid' }) subjectId!: string
  @ApiProperty({ format: 'uuid', nullable: true }) packageId!: string | null
  @ApiProperty({ enum: EXAM_DELIVERY_MODES })
  deliveryMode!: ExamActivity['deliveryMode']

  @ApiProperty({ enum: EXAM_OFFLINE_KINDS, nullable: true })
  offlineKind!: ExamActivity['offlineKind']

  @ApiProperty() maxScore!: number
  @ApiProperty() autoStatus!: boolean
  @ApiProperty({ enum: EXAM_TYPES }) type!: ExamType
  @ApiProperty({ enum: EXAM_CATEGORIES }) category!: ExamCategory
  @ApiProperty({ enum: ACTIVITY_TOKEN_MODES })
  tokenMode!: ExamActivity['tokenMode']
  @ApiProperty() tokenRotation!: number
  @ApiProperty({ type: ExamPolicyDto }) policy!: ExamPolicyDto
  @ApiProperty({ format: 'date-time' }) startsAt!: string
  @ApiProperty({ format: 'date-time' }) endsAt!: string
  @ApiProperty() durationMinutes!: number
  @ApiProperty({ enum: ACTIVITY_STATUSES })
  status!: ExamActivity['status']

  @ApiProperty({ type: String, nullable: true }) subjectName!: string | null
  @ApiProperty({ type: String, nullable: true }) gradeName!: string | null

  static of(
    activity: ExamActivity,
    names: { subjectName: string | null; gradeName: string | null } = {
      subjectName: null,
      gradeName: null,
    },
  ): ExamActivityDto {
    const dto = new ExamActivityDto()
    dto.subjectName = names.subjectName
    dto.gradeName = names.gradeName
    dto.id = activity.id
    dto.semesterId = activity.semesterId
    dto.eventId = activity.eventId
    dto.gradeId = activity.gradeId
    dto.subjectId = activity.subjectId
    dto.packageId = activity.packageId
    dto.deliveryMode = activity.deliveryMode
    dto.offlineKind = activity.offlineKind
    dto.maxScore = activity.maxScore
    dto.autoStatus = activity.autoStatus
    dto.type = activity.type
    dto.category = categoryOf(activity.type)
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

export class ExamActivityScheduleDto {
  @ApiProperty({ format: 'uuid' }) scheduleId!: string
  @ApiProperty({ format: 'uuid' }) classroomId!: string
  @ApiProperty({ type: String, nullable: true }) classroomName!: string | null
  @ApiProperty({ format: 'date-time' }) startsAt!: string
  @ApiProperty({ format: 'date-time' }) endsAt!: string
}

export class ExamActivityDetailDto extends ExamActivityDto {
  @ApiProperty({ type: () => [ExamActivityScheduleDto] })
  schedules!: ExamActivityScheduleDto[]

  static ofDetail(
    activity: ExamActivity,
    schedules: {
      scheduleId: string
      classroomId: string
      classroomName: string | null
      startsAt: Date
      endsAt: Date
    }[],
  ): ExamActivityDetailDto {
    const dto = Object.assign(
      new ExamActivityDetailDto(),
      ExamActivityDto.of(activity),
    )
    dto.schedules = schedules.map((row) => {
      const item = new ExamActivityScheduleDto()
      item.scheduleId = row.scheduleId
      item.classroomId = row.classroomId
      item.classroomName = row.classroomName
      item.startsAt = row.startsAt.toISOString()
      item.endsAt = row.endsAt.toISOString()
      return item
    })
    return dto
  }
}
