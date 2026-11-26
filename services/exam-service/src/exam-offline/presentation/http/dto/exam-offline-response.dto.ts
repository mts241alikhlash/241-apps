import { ApiProperty } from '@nestjs/swagger'
import { EXAM_OFFLINE_KINDS } from '../../../../exam-activity/domain/entities/exam-activity.entity.js'
import type { OfflinePublicationCounts } from '../../../application/use-cases/request-offline-publication/request-offline-publication.use-case.js'
import type {
  OfflineImportRejection,
  OfflineImportResult,
} from '../../../application/use-cases/import-offline-scores/import-offline-scores.use-case.js'
import {
  OFFLINE_PUBLICATION_STATUSES,
  OFFLINE_STUDENT_STATES,
  type OfflinePublicationStatus,
  type OfflineRosterRow,
  type OfflineScheduleRow,
  type OfflineStudentState,
} from '../../../domain/entities/offline-result.entity.js'

export class OfflineScheduleRowDto {
  @ApiProperty({ format: 'uuid' }) scheduleId!: string
  @ApiProperty({ format: 'uuid' }) activityId!: string
  @ApiProperty({ type: String, nullable: true }) subjectName!: string | null
  @ApiProperty({ type: String, nullable: true }) classroomName!: string | null
  @ApiProperty({ enum: EXAM_OFFLINE_KINDS }) offlineKind!:
    'WRITTEN' | 'PRACTICAL'
  @ApiProperty() maxScore!: number
  @ApiProperty({ format: 'date-time' }) startsAt!: string
  @ApiProperty({ format: 'date-time' }) endsAt!: string
  @ApiProperty() registered!: number
  @ApiProperty() scored!: number
  @ApiProperty() absent!: number
  @ApiProperty() missing!: number
  @ApiProperty() published!: number

  static fromDomain(domain: OfflineScheduleRow): OfflineScheduleRowDto {
    const dto = new OfflineScheduleRowDto()
    dto.scheduleId = domain.scheduleId
    dto.activityId = domain.activityId
    dto.subjectName = domain.subjectName
    dto.classroomName = domain.classroomName
    dto.offlineKind = domain.offlineKind
    dto.maxScore = domain.maxScore
    dto.startsAt = domain.startsAt.toISOString()
    dto.endsAt = domain.endsAt.toISOString()
    dto.registered = domain.registered
    dto.scored = domain.scored
    dto.absent = domain.absent
    dto.missing = domain.missing
    dto.published = domain.published
    return dto
  }
}

export class OfflineRosterRowDto {
  @ApiProperty({ format: 'uuid' }) studentId!: string
  @ApiProperty({ type: String, nullable: true })
  participantNumber!: string | null
  @ApiProperty({ type: String, nullable: true }) name!: string | null
  @ApiProperty({ enum: OFFLINE_STUDENT_STATES }) state!: OfflineStudentState
  @ApiProperty({ type: Number, nullable: true }) rawScore!: number | null
  @ApiProperty({ type: String, nullable: true }) note!: string | null
  @ApiProperty({ enum: OFFLINE_PUBLICATION_STATUSES, nullable: true })
  publication!: OfflinePublicationStatus | null

  static fromDomain(domain: OfflineRosterRow): OfflineRosterRowDto {
    const dto = new OfflineRosterRowDto()
    dto.studentId = domain.studentId
    dto.participantNumber = domain.participantNumber
    dto.name = domain.name
    dto.state = domain.state
    dto.rawScore = domain.rawScore
    dto.note = domain.note
    dto.publication = domain.publication
    return dto
  }
}

export class OfflineImportRejectionDto {
  @ApiProperty({ description: 'The 1-based row of the spreadsheet' })
  row!: number
  @ApiProperty({ type: String, nullable: true })
  participantNumber!: string | null
  @ApiProperty() reason!: string

  static fromDomain(domain: OfflineImportRejection): OfflineImportRejectionDto {
    const dto = new OfflineImportRejectionDto()
    dto.row = domain.row
    dto.participantNumber = domain.participantNumber
    dto.reason = domain.reason
    return dto
  }
}

export class OfflineImportResultDto {
  @ApiProperty() saved!: number
  @ApiProperty({ type: [OfflineImportRejectionDto] })
  rejected!: OfflineImportRejectionDto[]

  static fromDomain(domain: OfflineImportResult): OfflineImportResultDto {
    const dto = new OfflineImportResultDto()
    dto.saved = domain.saved
    dto.rejected = domain.rejected.map((row) =>
      OfflineImportRejectionDto.fromDomain(row),
    )
    return dto
  }
}

export class OfflinePublicationCountsDto {
  @ApiProperty() queued!: number
  @ApiProperty() missing!: number
  @ApiProperty() absent!: number

  static fromDomain(
    domain: OfflinePublicationCounts,
  ): OfflinePublicationCountsDto {
    const dto = new OfflinePublicationCountsDto()
    dto.queued = domain.queued
    dto.missing = domain.missing
    dto.absent = domain.absent
    return dto
  }
}
