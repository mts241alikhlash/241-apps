import { ApiProperty } from '@nestjs/swagger'
import { IsISO8601, IsIn } from 'class-validator'
import {
  SNAPSHOT_KINDS,
  type SnapshotKind,
} from '../../../domain/entities/exam-proctor-snapshot.entity.js'

export class UploadProctorSnapshotDto {
  @ApiProperty({ enum: SNAPSHOT_KINDS })
  @IsIn(SNAPSHOT_KINDS)
  kind!: SnapshotKind

  @ApiProperty({ format: 'date-time' })
  @IsISO8601()
  capturedAt!: string
}

export class ProctorSnapshotUploadedDto {
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  evidenceId!: string | null

  static of(evidenceId: string | null): ProctorSnapshotUploadedDto {
    const dto = new ProctorSnapshotUploadedDto()
    dto.evidenceId = evidenceId
    return dto
  }
}

export class ProctorSnapshotDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ format: 'uuid' }) sessionId!: string
  @ApiProperty({ enum: SNAPSHOT_KINDS }) kind!: SnapshotKind
  @ApiProperty() sizeBytes!: number
  @ApiProperty({ format: 'date-time' }) capturedAt!: string
  @ApiProperty({ format: 'date-time' }) expiresAt!: string
  @ApiProperty({ format: 'date-time' }) createdAt!: string

  static fromDomain(row: {
    id: string
    sessionId: string
    kind: SnapshotKind
    sizeBytes: number
    capturedAt: Date
    expiresAt: Date
    createdAt: Date
  }): ProctorSnapshotDto {
    const dto = new ProctorSnapshotDto()
    dto.id = row.id
    dto.sessionId = row.sessionId
    dto.kind = row.kind
    dto.sizeBytes = row.sizeBytes
    dto.capturedAt = row.capturedAt.toISOString()
    dto.expiresAt = row.expiresAt.toISOString()
    dto.createdAt = row.createdAt.toISOString()
    return dto
  }
}
