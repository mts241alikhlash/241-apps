import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsUUID } from 'class-validator'
import { DayEnum as Day } from '@mts241alikhlash/nest-core/domain'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'

export class ScheduleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teachingAssignmentId?: string

  @ApiPropertyOptional({ enum: Day })
  @IsOptional()
  @IsEnum(Day)
  day?: Day

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  timeSlotId?: string
}
