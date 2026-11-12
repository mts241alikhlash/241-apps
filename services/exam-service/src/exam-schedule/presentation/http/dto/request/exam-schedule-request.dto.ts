import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'
import {
  EXAM_CATEGORIES,
  EXAM_SCHEDULE_STATUSES,
  EXAM_TYPES,
  type ExamCategory,
  type ExamScheduleStatus,
  type ExamType,
} from '../../../../domain/entities/exam-schedule.entity.js'

const HAS_TIME_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i

export class UpdateExamScheduleDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  @Matches(HAS_TIME_ZONE, { message: 'startsAt must include a time zone' })
  startsAt!: string

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  @Matches(HAS_TIME_ZONE, { message: 'endsAt must include a time zone' })
  endsAt!: string

  @ApiProperty({ minimum: 1, maximum: 1440 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes!: number

  @ApiPropertyOptional({ minimum: 0, maximum: 1440 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  minSubmitMinutes?: number

  @ApiProperty({ enum: EXAM_TYPES })
  @IsIn(EXAM_TYPES)
  type!: ExamType

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'The exam event this schedule belongs to; seats come from it',
  })
  @IsOptional()
  @IsUUID()
  eventId?: string
}

export class CreateExamScheduleDto extends UpdateExamScheduleDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() packageId!: string
  @ApiProperty({ format: 'uuid' }) @IsUUID() classroomId!: string
}

export class ExamScheduleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classroomId?: string

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  packageId?: string

  @ApiPropertyOptional({ enum: EXAM_SCHEDULE_STATUSES })
  @IsOptional()
  @IsIn(EXAM_SCHEDULE_STATUSES)
  status?: ExamScheduleStatus

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string

  @ApiPropertyOptional({ enum: EXAM_CATEGORIES })
  @IsOptional()
  @IsIn(EXAM_CATEGORIES)
  category?: ExamCategory
}
