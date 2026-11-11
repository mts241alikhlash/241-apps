import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'
import {
  EXAM_CATEGORIES,
  type ExamCategory,
} from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { EXAM_SESSION_STATUSES } from '../../../../exam-session/domain/entities/exam-session.entity.js'
import type { ExamSessionStatus } from '../../../../exam-session/domain/entities/exam-session.entity.js'

export class GradingScheduleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Defaults to the active semester',
  })
  @IsOptional()
  @IsUUID()
  semesterId?: string

  @ApiPropertyOptional({ enum: EXAM_CATEGORIES })
  @IsOptional()
  @IsIn(EXAM_CATEGORIES)
  category?: ExamCategory
}

export class GradingSessionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EXAM_SESSION_STATUSES })
  @IsOptional()
  @IsEnum(EXAM_SESSION_STATUSES)
  status?: ExamSessionStatus
}

export class GradeAnswerDto {
  @ApiProperty({ description: 'From 0 up to the points of the question' })
  @IsNumber()
  @Min(0)
  score!: number

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
