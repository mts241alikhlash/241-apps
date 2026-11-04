import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator'
import { AttendanceStatus } from '@mts241alikhlash/nest-core/domain'

export class BulkAttendanceRecordDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() enrollmentId: string
  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}

export class BulkUpsertAttendanceDto {
  @ApiProperty() @IsDateString() date: string
  @ApiPropertyOptional() @IsOptional() @IsUUID() scheduleId?: string
  @ApiProperty({ type: [BulkAttendanceRecordDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkAttendanceRecordDto)
  records: BulkAttendanceRecordDto[]
}
