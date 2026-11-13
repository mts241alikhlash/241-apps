import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'
import {
  EXAM_CATEGORIES,
  EXAM_TYPES,
  type ExamCategory,
  type ExamType,
} from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { categoryOf } from '../../../../exam-schedule/domain/policies/exam-category.policy.js'
import { EXAM_EVENT_STATUSES } from '../../../../exam-room/domain/entities/exam-event.entity.js'

export class CreateExamEventDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() semesterId!: string

  @ApiProperty() @IsString() @Length(1, 150) name!: string

  @ApiProperty({ enum: EXAM_TYPES }) @IsIn(EXAM_TYPES) type!: ExamType

  @ApiProperty({ format: 'date-time' }) @IsISO8601() startsAt!: string

  @ApiProperty({ format: 'date-time' }) @IsISO8601() endsAt!: string

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateToleranceMinutes?: number

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSubmitMinutes?: number
}

export class UpdateExamEventDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 150) name?: string

  @ApiPropertyOptional({ enum: EXAM_TYPES })
  @IsOptional()
  @IsIn(EXAM_TYPES)
  type?: ExamType

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  startsAt?: string

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  endsAt?: string

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateToleranceMinutes?: number

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSubmitMinutes?: number

  @ApiPropertyOptional({ enum: EXAM_EVENT_STATUSES })
  @IsOptional()
  @IsIn(EXAM_EVENT_STATUSES)
  status?: (typeof EXAM_EVENT_STATUSES)[number]
}

export class ExamEventQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  semesterId?: string

  @ApiPropertyOptional({ enum: EXAM_EVENT_STATUSES })
  @IsOptional()
  @IsIn(EXAM_EVENT_STATUSES)
  status?: (typeof EXAM_EVENT_STATUSES)[number]
}

export class ExamEventDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ format: 'uuid' }) semesterId!: string
  @ApiProperty() name!: string
  @ApiProperty({ enum: EXAM_TYPES }) type!: ExamType
  @ApiProperty({ enum: EXAM_CATEGORIES }) category!: ExamCategory
  @ApiProperty({ format: 'date-time' }) startsAt!: string
  @ApiProperty({ format: 'date-time' }) endsAt!: string
  @ApiProperty() lateToleranceMinutes!: number
  @ApiProperty() minSubmitMinutes!: number
  @ApiProperty({ enum: EXAM_EVENT_STATUSES }) status!: string

  static fromDomain(domain: {
    id: string
    semesterId: string
    name: string
    type: ExamType
    startsAt: Date
    endsAt: Date
    lateToleranceMinutes: number
    minSubmitMinutes: number
    status: string
  }): ExamEventDto {
    const dto = new ExamEventDto()
    dto.id = domain.id
    dto.semesterId = domain.semesterId
    dto.name = domain.name
    dto.type = domain.type
    dto.category = categoryOf(domain.type)
    dto.startsAt = domain.startsAt.toISOString()
    dto.endsAt = domain.endsAt.toISOString()
    dto.lateToleranceMinutes = domain.lateToleranceMinutes
    dto.minSubmitMinutes = domain.minSubmitMinutes
    dto.status = domain.status
    return dto
  }
}

export class ExamEventListResponseDto {
  @ApiProperty({ type: () => [ExamEventDto] }) data!: ExamEventDto[]
  @ApiProperty() total!: number
  @ApiProperty() page!: number
  @ApiProperty() limit!: number

  static fromDomain(domain: {
    data: Parameters<typeof ExamEventDto.fromDomain>[0][]
    total: number
    page: number
    limit: number
  }): ExamEventListResponseDto {
    const dto = new ExamEventListResponseDto()
    dto.data = domain.data.map((row) => ExamEventDto.fromDomain(row))
    dto.total = domain.total
    dto.page = domain.page
    dto.limit = domain.limit
    return dto
  }
}

export class CreateExamRoomDto {
  @ApiProperty() @IsString() @Length(1, 30) code!: string
  @ApiProperty() @IsString() @Length(1, 100) name!: string

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  building?: string

  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) capacity!: number

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  technicianUserId?: string
}

export class UpdateExamRoomDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 30) code?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 100) name?: string

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  building?: string

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  technicianUserId?: string
}

export class ExamRoomSeatDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() studentId!: string

  @ApiProperty({ format: 'uuid' }) @IsUUID() classroomId!: string

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  seatNumber?: number
}

export class ExamRoomSeatResponseDto {
  @ApiProperty({ format: 'uuid' }) studentId!: string

  @ApiProperty({ format: 'uuid' }) classroomId!: string

  @ApiProperty({ minimum: 1 }) seatNumber!: number
}

export class ExamRoomDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ format: 'uuid' }) eventId!: string
  @ApiProperty() code!: string
  @ApiProperty() name!: string
  @ApiProperty({ type: String, nullable: true }) building!: string | null
  @ApiProperty() capacity!: number
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  technicianUserId!: string | null
  @ApiProperty() tokenRotation!: number

  static fromDomain(domain: {
    id: string
    eventId: string
    code: string
    name: string
    building: string | null
    capacity: number
    technicianUserId: string | null
    tokenRotation: number
  }): ExamRoomDto {
    const dto = new ExamRoomDto()
    dto.id = domain.id
    dto.eventId = domain.eventId
    dto.code = domain.code
    dto.name = domain.name
    dto.building = domain.building
    dto.capacity = domain.capacity
    dto.technicianUserId = domain.technicianUserId
    dto.tokenRotation = domain.tokenRotation
    return dto
  }
}

export class AssignSeatsDto {
  @ApiProperty({ type: [ExamRoomSeatDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ExamRoomSeatDto)
  students!: ExamRoomSeatDto[]

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  roomIds?: string[]

  @ApiPropertyOptional({ description: 'Round-robin the students by classroom' })
  @IsOptional()
  interleaveByClassroom?: boolean
}

export class RoomAccessCodeDto {
  @ApiProperty() accessCode!: string
  @ApiProperty() rotation!: number
  @ApiProperty({ format: 'date-time' }) expiresAt!: string
}
