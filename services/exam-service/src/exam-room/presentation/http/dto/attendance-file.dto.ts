import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator'
import {
  ATTENDANCE_KINDS,
  type AttendanceFile,
  type AttendanceKind,
} from '../../../domain/entities/attendance-file.entity.js'

const DAY = /^\d{4}-\d{2}-\d{2}$/

export class AttendanceUploadBodyDto {
  @ApiProperty({ enum: ATTENDANCE_KINDS })
  @IsIn(ATTENDANCE_KINDS)
  kind!: AttendanceKind

  @ApiProperty({ example: '2026-11-18', description: 'WIB calendar day' })
  @Matches(DAY)
  day!: string

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  roomId?: string

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  slotId?: string

  @ApiProperty({ type: 'string', format: 'binary' })
  file!: unknown
}

export class AttendanceListQueryDto {
  @ApiPropertyOptional({ enum: ATTENDANCE_KINDS })
  @IsOptional()
  @IsIn(ATTENDANCE_KINDS)
  kind?: AttendanceKind

  @ApiPropertyOptional({ example: '2026-11-18' })
  @IsOptional()
  @Matches(DAY)
  day?: string
}

export class AttendanceFileDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ enum: ATTENDANCE_KINDS }) kind!: AttendanceKind
  @ApiProperty({ example: '2026-11-18' }) day!: string
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) roomId!:
    string | null
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) slotId!:
    string | null
  @ApiProperty() originalName!: string
  @ApiProperty() sizeBytes!: number
  @ApiProperty({ format: 'date-time' }) uploadedAt!: string
  @ApiProperty({ format: 'uuid' }) uploadedById!: string

  static fromDomain(domain: AttendanceFile): AttendanceFileDto {
    const dto = new AttendanceFileDto()
    dto.id = domain.id
    dto.kind = domain.kind
    dto.day = domain.day
    dto.roomId = domain.roomId
    dto.slotId = domain.slotId
    dto.originalName = domain.originalName
    dto.sizeBytes = domain.sizeBytes
    dto.uploadedAt = domain.uploadedAt.toISOString()
    dto.uploadedById = domain.uploadedById
    return dto
  }
}
