import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'
import { SESSION_AUDIT_ACTIONS } from '../../../../exam-room/domain/entities/exam-session-audit-log.entity.js'
import { SESSION_EVENT_TYPES } from '../../../../exam-room/domain/entities/exam-session-event.entity.js'
import type { RecordedSessionEvents } from '../../../application/use-cases/record-session-events/record-session-events.use-case.js'
import type { ResumedSession } from '../../../application/use-cases/resume-exam-session/resume-exam-session.use-case.js'
import { SebProofDto } from '../../../../seb/presentation/http/dto/seb-config.dto.js'

export class SessionEventItemDto {
  @ApiProperty({ description: 'Stable id of the event on the tablet' })
  @IsString()
  @Length(1, 64)
  clientId!: string

  @ApiProperty({ enum: SESSION_EVENT_TYPES })
  @IsIn(SESSION_EVENT_TYPES)
  type!: (typeof SESSION_EVENT_TYPES)[number]

  @ApiProperty() @IsBoolean() isViolation!: boolean

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  detail?: string | null

  @ApiProperty({ format: 'date-time' })
  @IsISO8601()
  occurredAt!: string
}

export class RecordSessionEventsRequestDto {
  @ApiProperty({ type: [SessionEventItemDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SessionEventItemDto)
  events!: SessionEventItemDto[]
}

export class SessionEventDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty() clientId!: string
  @ApiProperty({ enum: SESSION_EVENT_TYPES }) type!: string
  @ApiProperty() isViolation!: boolean
  @ApiProperty({ type: String, nullable: true }) detail!: string | null
  @ApiProperty({ format: 'date-time' }) occurredAt!: string
}

export class RecordSessionEventsResponseDto {
  @ApiProperty({ type: [SessionEventDto] }) events!: SessionEventDto[]
  @ApiProperty({ minimum: 0 }) violationCount!: number
  @ApiProperty() requiresTokenReentry!: boolean
  @ApiProperty() lockedByViolation!: boolean
  @ApiProperty({ format: 'date-time' }) serverTime!: string

  static fromDomain(
    domain: RecordedSessionEvents,
  ): RecordSessionEventsResponseDto {
    const dto = new RecordSessionEventsResponseDto()
    dto.events = domain.events.map((event) => {
      const row = new SessionEventDto()
      row.id = event.id
      row.clientId = event.clientId
      row.type = event.type
      row.isViolation = event.isViolation
      row.detail = event.detail
      row.occurredAt = event.occurredAt.toISOString()
      return row
    })
    dto.violationCount = domain.violationCount
    dto.requiresTokenReentry = domain.requiresTokenReentry
    dto.lockedByViolation = domain.lockedByViolation
    dto.serverTime = domain.serverTime.toISOString()
    return dto
  }
}

export class ResumeSessionRequestDto {
  @ApiProperty({ description: 'The room or schedule token shown now' })
  @IsString()
  @Length(4, 12)
  accessCode!: string

  @ApiProperty()
  @IsString()
  @Length(1, 100)
  deviceId!: string

  @ApiPropertyOptional({ type: SebProofDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SebProofDto)
  seb?: SebProofDto
}

export class ResumeSessionResponseDto {
  @ApiProperty({ format: 'uuid' }) sessionId!: string
  @ApiProperty({ enum: ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'GRADED'] })
  status!: string
  @ApiProperty({ format: 'date-time' }) deadline!: string
  @ApiProperty({ format: 'date-time' }) serverTime!: string
  @ApiProperty() requiresTokenReentry!: boolean

  static fromDomain(domain: ResumedSession): ResumeSessionResponseDto {
    const dto = new ResumeSessionResponseDto()
    dto.sessionId = domain.session.id
    dto.status = domain.session.status
    dto.deadline = domain.session.deadline.toISOString()
    dto.serverTime = domain.serverTime.toISOString()
    dto.requiresTokenReentry = domain.session.requiresTokenReentry
    return dto
  }
}

export class RecoveryReasonDto {
  @ApiProperty({ minLength: 5, maxLength: 300 })
  @IsString()
  @Length(5, 300)
  reason!: string
}

export class ExtendSessionTimeDto extends RecoveryReasonDto {
  @ApiProperty({ minimum: 1, maximum: 120 })
  @IsInt()
  @Min(1)
  @Max(120)
  minutes!: number
}

export class ExtendRoomTimeDto extends ExtendSessionTimeDto {}

export class RecoverySessionDto {
  @ApiProperty({ format: 'uuid' }) sessionId!: string
  @ApiProperty({ format: 'uuid' }) scheduleId!: string
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  roomId!: string | null
  @ApiProperty({ enum: ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'GRADED'] })
  status!: string
  @ApiProperty() violationCount!: number
  @ApiProperty() lockedByViolation!: boolean
  @ApiProperty() requiresTokenReentry!: boolean
  @ApiProperty() extraMinutes!: number
  @ApiProperty() allowLateEntry!: boolean
  @ApiProperty({ format: 'date-time' }) deadline!: string
  @ApiProperty({ format: 'date-time' }) finalizeAt!: string
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submittedAt!: string | null
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  gradedAt!: string | null

  static fromDomain(domain: {
    id: string
    scheduleId: string
    roomId: string | null
    status: string
    violationCount: number
    lockedByViolation: boolean
    requiresTokenReentry: boolean
    extraMinutes: number
    allowLateEntry: boolean
    deadline: Date
    finalizeAt: Date
    submittedAt: Date | null
    gradedAt: Date | null
  }): RecoverySessionDto {
    const dto = new RecoverySessionDto()
    dto.sessionId = domain.id
    dto.scheduleId = domain.scheduleId
    dto.roomId = domain.roomId
    dto.status = domain.status
    dto.violationCount = domain.violationCount
    dto.lockedByViolation = domain.lockedByViolation
    dto.requiresTokenReentry = domain.requiresTokenReentry
    dto.extraMinutes = domain.extraMinutes
    dto.allowLateEntry = domain.allowLateEntry
    dto.deadline = domain.deadline.toISOString()
    dto.finalizeAt = domain.finalizeAt.toISOString()
    dto.submittedAt = domain.submittedAt?.toISOString() ?? null
    dto.gradedAt = domain.gradedAt?.toISOString() ?? null
    return dto
  }
}

export class RecoverySessionListDto {
  @ApiProperty({ type: [RecoverySessionDto] })
  data!: RecoverySessionDto[]

  static fromDomain(
    rows: Parameters<typeof RecoverySessionDto.fromDomain>[0][],
  ) {
    const dto = new RecoverySessionListDto()
    dto.data = rows.map((row) => RecoverySessionDto.fromDomain(row))
    return dto
  }
}

export class SeatFlagDto {
  @ApiProperty({ format: 'uuid' }) studentId!: string
  @ApiProperty() allowLateEntry!: boolean
}

export class SubstituteSupervisorDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  actualUserId!: string

  @ApiProperty({ minLength: 5, maxLength: 200 })
  @IsString()
  @Length(5, 200)
  reason!: string
}

export class AssignSupervisorDto extends RecoveryReasonDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  scheduledUserId!: string

  @ApiProperty({ format: 'date-time' })
  @IsISO8601()
  startsAt!: string

  @ApiProperty({ format: 'date-time' })
  @IsISO8601()
  endsAt!: string
}

export class AuditLogDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  sessionId!: string | null
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  roomId!: string | null
  @ApiProperty({ enum: SESSION_AUDIT_ACTIONS }) action!: string
  @ApiProperty({ format: 'uuid' }) actorId!: string
  @ApiProperty() reason!: string
  @ApiProperty() metadata!: Record<string, unknown>
  @ApiProperty({ format: 'date-time' }) createdAt!: string

  static fromDomain(domain: {
    id: string
    sessionId: string | null
    roomId: string | null
    action: string
    actorId: string
    reason: string
    metadata: Record<string, unknown>
    createdAt: Date
  }): AuditLogDto {
    const dto = new AuditLogDto()
    dto.id = domain.id
    dto.sessionId = domain.sessionId
    dto.roomId = domain.roomId
    dto.action = domain.action
    dto.actorId = domain.actorId
    dto.reason = domain.reason
    dto.metadata = domain.metadata
    dto.createdAt = domain.createdAt.toISOString()
    return dto
  }
}

export class SupervisorSlotDto {
  @ApiProperty({ format: 'uuid' }) slotId!: string
  @ApiProperty({ format: 'uuid' }) roomId!: string
  @ApiProperty({ format: 'uuid' }) scheduledUserId!: string
  @ApiProperty({ format: 'uuid' }) actualUserId!: string
  @ApiProperty({ format: 'date-time' }) startsAt!: string
  @ApiProperty({ format: 'date-time' }) endsAt!: string

  static fromDomain(domain: {
    id: string
    roomId: string
    scheduledUserId: string
    actualUserId: string
    startsAt: Date
    endsAt: Date
  }): SupervisorSlotDto {
    const dto = new SupervisorSlotDto()
    dto.slotId = domain.id
    dto.roomId = domain.roomId
    dto.scheduledUserId = domain.scheduledUserId
    dto.actualUserId = domain.actualUserId
    dto.startsAt = domain.startsAt.toISOString()
    dto.endsAt = domain.endsAt.toISOString()
    return dto
  }
}
