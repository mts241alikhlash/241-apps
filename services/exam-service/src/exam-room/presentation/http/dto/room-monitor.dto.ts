import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'
import { ROOM_EXECUTION_CONDITIONS } from '../../../../exam-room/domain/entities/exam-room-report.entity.js'
import { MAKEUP_REASONS } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type {
  RoomMonitorMeta,
  RoomMonitorParticipant,
  RoomMonitorSession,
} from '../../../application/use-cases/get-room-monitor/get-room-monitor.use-case.js'
import type { RoomOverviewRow } from '../../../application/use-cases/list-rooms-overview/list-rooms-overview.use-case.js'
import type {
  ReportAbsenceRow,
  ReportAuditRow,
  ReportFieldNoteRow,
  ReportScheduleRow,
  RoomReportView,
} from '../../../application/use-cases/get-room-report/get-room-report.use-case.js'
import type { SessionTimelineEntry } from '../../../application/use-cases/get-session-timeline/get-session-timeline.use-case.js'
import {
  MONITOR_STATUSES,
  type MonitorStatus,
} from '../../../application/use-cases/get-room-monitor/get-room-monitor.use-case.js'

export class RoomMonitorQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string

  @ApiPropertyOptional({ enum: MONITOR_STATUSES })
  @IsOptional()
  @IsIn(MONITOR_STATUSES)
  status?: MonitorStatus

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classroomId?: string

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  slotId?: string

  @ApiPropertyOptional({ default: 25, minimum: 5, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(100)
  limit?: number = 25
}

export class RoomMonitorLastEventDto {
  @ApiProperty() type!: string
  @ApiProperty({ format: 'date-time' }) occurredAt!: string
  @ApiProperty({ type: String, nullable: true }) detail!: string | null
}

export class RoomMonitorSessionDto {
  @ApiProperty({ format: 'uuid' }) sessionId!: string
  @ApiProperty({ enum: ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'GRADED'] })
  status!: string
  @ApiProperty({ format: 'date-time' }) startedAt!: string
  @ApiProperty({ format: 'date-time' }) deadline!: string
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submittedAt!: string | null
  @ApiProperty() extraMinutes!: number
  @ApiProperty() answeredCount!: number
  @ApiProperty() syncedAnswerCount!: number
  @ApiProperty() unsyncedCount!: number
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastSeenAt!: string | null
  @ApiProperty({ type: Number, nullable: true }) batteryLevel!: number | null
  @ApiProperty({ type: Boolean, nullable: true }) isCharging!: boolean | null
  @ApiProperty({ type: Boolean, nullable: true }) dndGranted!: boolean | null
  @ApiProperty({ type: Boolean, nullable: true }) lockTaskActive!:
    boolean | null
  @ApiProperty({ type: Boolean, nullable: true })
  batteryUnrestricted!: boolean | null
  @ApiProperty() kioskMode!: string
  @ApiProperty() allowWebClient!: boolean
  @ApiProperty() violationCount!: number
  @ApiProperty() lockedByViolation!: boolean
  @ApiProperty() requiresTokenReentry!: boolean
  @ApiProperty({ type: () => RoomMonitorLastEventDto, nullable: true })
  lastEvent!: RoomMonitorLastEventDto | null

  static fromDomain(domain: RoomMonitorSession): RoomMonitorSessionDto {
    const dto = new RoomMonitorSessionDto()
    dto.sessionId = domain.sessionId
    dto.status = domain.status
    dto.startedAt = domain.startedAt
    dto.deadline = domain.deadline
    dto.submittedAt = domain.submittedAt
    dto.extraMinutes = domain.extraMinutes
    dto.answeredCount = domain.answeredCount
    dto.syncedAnswerCount = domain.syncedAnswerCount
    dto.unsyncedCount = domain.unsyncedCount
    dto.lastSeenAt = domain.lastSeenAt
    dto.batteryLevel = domain.batteryLevel
    dto.isCharging = domain.isCharging
    dto.dndGranted = domain.dndGranted
    dto.lockTaskActive = domain.lockTaskActive
    dto.batteryUnrestricted = domain.batteryUnrestricted
    dto.kioskMode = domain.kioskMode
    dto.allowWebClient = domain.allowWebClient
    dto.violationCount = domain.violationCount
    dto.lockedByViolation = domain.lockedByViolation
    dto.requiresTokenReentry = domain.requiresTokenReentry
    dto.lastEvent = domain.lastEvent
    return dto
  }
}

export class RoomMonitorAbsenceDto {
  @ApiProperty({ enum: MAKEUP_REASONS }) reason!: string
  @ApiProperty({ type: String, nullable: true }) note!: string | null
}

export class RoomMonitorParticipantDto {
  @ApiProperty() seatNumber!: number
  @ApiProperty({ format: 'uuid' }) studentId!: string
  @ApiProperty({ type: String, nullable: true }) studentName!: string | null
  @ApiProperty({ type: String, nullable: true }) nis!: string | null
  @ApiProperty({ type: String, nullable: true }) classroomName!: string | null
  @ApiProperty({ type: String, nullable: true }) subjectName!: string | null
  @ApiProperty() packageTitle!: string
  @ApiProperty({ format: 'uuid' }) scheduleId!: string
  @ApiProperty() totalQuestions!: number
  @ApiProperty({ type: () => RoomMonitorSessionDto, nullable: true })
  session!: RoomMonitorSessionDto | null
  @ApiProperty({ type: () => RoomMonitorAbsenceDto, nullable: true })
  absence!: RoomMonitorAbsenceDto | null

  static fromDomain(domain: RoomMonitorParticipant): RoomMonitorParticipantDto {
    const dto = new RoomMonitorParticipantDto()
    dto.seatNumber = domain.seatNumber
    dto.studentId = domain.studentId
    dto.studentName = domain.studentName
    dto.nis = domain.nis
    dto.classroomName = domain.classroomName
    dto.subjectName = domain.subjectName
    dto.packageTitle = domain.packageTitle
    dto.scheduleId = domain.scheduleId
    dto.totalQuestions = domain.totalQuestions
    dto.session =
      domain.session === null
        ? null
        : RoomMonitorSessionDto.fromDomain(domain.session)
    dto.absence =
      domain.absence === null
        ? null
        : Object.assign(new RoomMonitorAbsenceDto(), domain.absence)
    return dto
  }
}

export class RoomMonitorRoomDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty() code!: string
  @ApiProperty() name!: string
  @ApiProperty() capacity!: number
  @ApiProperty({ type: String, nullable: true }) technicianName!: string | null
  @ApiProperty({ type: String, nullable: true })
  currentSupervisorName!: string | null
  @ApiProperty({ type: String, nullable: true })
  scheduledSupervisorName!: string | null
  @ApiProperty() isSubstituted!: boolean
}

export class RoomMonitorTokenDto {
  @ApiProperty() accessCode!: string
  @ApiProperty({ format: 'date-time' }) expiresAt!: string
  @ApiProperty() rotation!: number
}

export class RoomMonitorSummaryDto {
  @ApiProperty() totalRegistered!: number
  @ApiProperty() notStartedCount!: number
  @ApiProperty() inProgressCount!: number
  @ApiProperty() offlineOrUnsyncedCount!: number
  @ApiProperty() lockedOrViolationCount!: number
  @ApiProperty() finishedCount!: number
  @ApiProperty() absentMarkedCount!: number
}

export class RoomMonitorMetaDto {
  @ApiProperty() page!: number
  @ApiProperty() limit!: number
  @ApiProperty() total!: number
  @ApiProperty({ format: 'date-time' }) serverTime!: string
  @ApiProperty({ type: () => RoomMonitorRoomDto }) room!: RoomMonitorRoomDto
  @ApiProperty({ type: () => RoomMonitorTokenDto, nullable: true })
  token!: RoomMonitorTokenDto | null
  @ApiProperty({ type: () => RoomMonitorSummaryDto })
  summary!: RoomMonitorSummaryDto

  static fromDomain(domain: RoomMonitorMeta): RoomMonitorMetaDto {
    const dto = new RoomMonitorMetaDto()
    dto.page = domain.page
    dto.limit = domain.limit
    dto.total = domain.total
    dto.serverTime = domain.serverTime
    dto.room = Object.assign(new RoomMonitorRoomDto(), domain.room)
    dto.token =
      domain.token === null
        ? null
        : Object.assign(new RoomMonitorTokenDto(), domain.token)
    dto.summary = Object.assign(new RoomMonitorSummaryDto(), domain.summary)
    return dto
  }
}

export class RoomMonitorResponseDto {
  @ApiProperty({ type: [RoomMonitorParticipantDto] })
  data!: RoomMonitorParticipantDto[]

  @ApiProperty({ type: () => RoomMonitorMetaDto })
  meta!: RoomMonitorMetaDto

  static fromDomain(domain: {
    data: RoomMonitorParticipant[]
    meta: RoomMonitorMeta
  }): RoomMonitorResponseDto {
    const dto = new RoomMonitorResponseDto()
    dto.data = domain.data.map((row) =>
      RoomMonitorParticipantDto.fromDomain(row),
    )
    dto.meta = RoomMonitorMetaDto.fromDomain(domain.meta)
    return dto
  }
}

export class RoomOverviewQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  eventId?: string
}

export class RoomOverviewDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ format: 'uuid' }) eventId!: string
  @ApiProperty() code!: string
  @ApiProperty() name!: string
  @ApiProperty({ type: String, nullable: true }) building!: string | null
  @ApiProperty() capacity!: number
  @ApiProperty() registeredCount!: number
  @ApiProperty({ type: String, nullable: true }) technicianName!: string | null
  @ApiProperty({ type: String, nullable: true })
  currentSupervisorName!: string | null
  @ApiProperty() isSubstituted!: boolean
  @ApiProperty() isActiveNow!: boolean

  static fromDomain(domain: RoomOverviewRow): RoomOverviewDto {
    return Object.assign(new RoomOverviewDto(), domain)
  }
}

export class SessionTimelineEntryDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ enum: ['EVENT', 'AUDIT'] }) kind!: string
  @ApiProperty({ format: 'date-time' }) occurredAt!: string
  @ApiProperty({ type: String, nullable: true }) type!: string | null
  @ApiProperty({ type: String, nullable: true }) action!: string | null
  @ApiProperty() isViolation!: boolean
  @ApiProperty({ type: String, nullable: true }) detail!: string | null
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  actorId!: string | null
  @ApiProperty({ type: String, nullable: true }) reason!: string | null
  @ApiProperty() metadata!: Record<string, unknown>

  static fromDomain(domain: SessionTimelineEntry): SessionTimelineEntryDto {
    return Object.assign(new SessionTimelineEntryDto(), domain)
  }
}

export class UpdateRoomReportDto {
  @ApiPropertyOptional({ enum: ROOM_EXECUTION_CONDITIONS })
  @IsOptional()
  @IsIn(ROOM_EXECUTION_CONDITIONS)
  condition?: (typeof ROOM_EXECUTION_CONDITIONS)[number]

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  incidentNotes?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reopen?: boolean
}

export class RecordRoomAbsenceDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() studentId!: string

  @ApiProperty({ format: 'uuid' }) @IsUUID() scheduleId!: string

  @ApiProperty({ enum: MAKEUP_REASONS }) @IsIn(MAKEUP_REASONS) reason!: string

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  note?: string
}

export class RecordRoomFieldNoteDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() studentId!: string

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sessionId?: string

  @ApiProperty({ maxLength: 50 }) @IsString() @Length(1, 50) category!: string

  @ApiProperty({ maxLength: 300 }) @IsString() @Length(1, 300) note!: string
}

export class ReportScheduleDto {
  @ApiProperty({ format: 'uuid' }) scheduleId!: string
  @ApiProperty() packageTitle!: string
  @ApiProperty({ type: String, nullable: true }) subjectName!: string | null
  @ApiProperty({ type: String, nullable: true }) classroomName!: string | null
  @ApiProperty({ format: 'date-time' }) startsAt!: string
  @ApiProperty({ format: 'date-time' }) endsAt!: string
  @ApiProperty() registeredCount!: number
  @ApiProperty() startedCount!: number
  @ApiProperty() submittedCount!: number
  @ApiProperty() absentCount!: number

  static fromDomain(domain: ReportScheduleRow): ReportScheduleDto {
    return Object.assign(new ReportScheduleDto(), domain)
  }
}

export class ReportAbsenceDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ format: 'uuid' }) studentId!: string
  @ApiProperty({ type: String, nullable: true }) studentName!: string | null
  @ApiProperty({ type: String, nullable: true }) nis!: string | null
  @ApiProperty({ format: 'uuid' }) scheduleId!: string
  @ApiProperty({ enum: MAKEUP_REASONS }) reason!: string
  @ApiProperty({ type: String, nullable: true }) note!: string | null
  @ApiProperty({ format: 'date-time' }) updatedAt!: string

  static fromDomain(domain: ReportAbsenceRow): ReportAbsenceDto {
    return Object.assign(new ReportAbsenceDto(), domain)
  }
}

export class ReportFieldNoteDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ format: 'uuid' }) studentId!: string
  @ApiProperty({ type: String, nullable: true }) studentName!: string | null
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  sessionId!: string | null
  @ApiProperty() category!: string
  @ApiProperty() note!: string
  @ApiProperty({ format: 'date-time' }) recordedAt!: string

  static fromDomain(domain: ReportFieldNoteRow): ReportFieldNoteDto {
    return Object.assign(new ReportFieldNoteDto(), domain)
  }
}

export class ReportAuditDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  sessionId!: string | null
  @ApiProperty() action!: string
  @ApiProperty({ format: 'uuid' }) actorId!: string
  @ApiProperty() reason!: string
  @ApiProperty() metadata!: Record<string, unknown>
  @ApiProperty({ format: 'date-time' }) createdAt!: string

  static fromDomain(domain: ReportAuditRow): ReportAuditDto {
    return Object.assign(new ReportAuditDto(), domain)
  }
}

export class RoomReportSlotDto {
  @ApiProperty({ format: 'date-time' }) startsAt!: string
  @ApiProperty({ format: 'date-time' }) endsAt!: string
}

export class RoomReportDto {
  @ApiProperty({ format: 'uuid' }) reportId!: string
  @ApiProperty({ format: 'uuid' }) roomId!: string
  @ApiProperty({ format: 'uuid' }) slotId!: string
  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'VERIFIED'] }) status!: string
  @ApiProperty({ enum: ROOM_EXECUTION_CONDITIONS }) condition!: string
  @ApiProperty({ type: String, nullable: true })
  incidentNotes!: string | null
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submittedAt!: string | null
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  verifiedAt!: string | null
  @ApiProperty({ type: () => RoomReportSlotDto }) slot!: RoomReportSlotDto
  @ApiProperty({ type: [ReportScheduleDto] }) schedules!: ReportScheduleDto[]
  @ApiProperty({ type: [ReportAbsenceDto] }) absences!: ReportAbsenceDto[]
  @ApiProperty({ type: [ReportFieldNoteDto] })
  fieldNotes!: ReportFieldNoteDto[]
  @ApiProperty({ type: [ReportAuditDto] }) auditLogs!: ReportAuditDto[]

  static fromDomain(domain: RoomReportView): RoomReportDto {
    const dto = new RoomReportDto()
    dto.reportId = domain.reportId
    dto.roomId = domain.roomId
    dto.slotId = domain.slotId
    dto.status = domain.status
    dto.condition = domain.condition
    dto.incidentNotes = domain.incidentNotes
    dto.submittedAt = domain.submittedAt
    dto.verifiedAt = domain.verifiedAt
    dto.slot = Object.assign(new RoomReportSlotDto(), domain.slot)
    dto.schedules = domain.schedules.map((row) =>
      ReportScheduleDto.fromDomain(row),
    )
    dto.absences = domain.absences.map((row) =>
      ReportAbsenceDto.fromDomain(row),
    )
    dto.fieldNotes = domain.fieldNotes.map((row) =>
      ReportFieldNoteDto.fromDomain(row),
    )
    dto.auditLogs = domain.auditLogs.map((row) =>
      ReportAuditDto.fromDomain(row),
    )
    return dto
  }
}
