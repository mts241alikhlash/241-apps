import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'
import { DayEnum as Day } from '@mts241alikhlash/nest-core/domain'

export class UpdateScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teachingAssignmentId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  timeSlotId?: string

  @ApiPropertyOptional({ enum: Day })
  @IsOptional()
  @IsEnum(Day)
  day?: Day

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string
}
