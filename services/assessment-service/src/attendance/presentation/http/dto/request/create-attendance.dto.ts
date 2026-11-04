import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator'
import { AttendanceStatus } from '@mts241alikhlash/nest-core/domain'

export class CreateAttendanceDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() enrollmentId: string
  @ApiPropertyOptional() @IsOptional() @IsUUID() scheduleId?: string
  @ApiProperty() @IsDateString() date: string
  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}
