import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator'
import { AttendanceStatus } from '@mts241alikhlash/nest-core/domain'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'

export class AttendanceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() enrollmentId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID() scheduleId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID() classroomId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID() semesterId?: string
  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus
  @ApiPropertyOptional() @IsOptional() @IsDateString() date?: string
}
