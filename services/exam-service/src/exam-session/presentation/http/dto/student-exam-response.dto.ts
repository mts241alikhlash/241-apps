import { ApiProperty } from '@nestjs/swagger'
import { ACTIVITY_STATUSES } from '../../../../exam-activity/domain/entities/exam-activity.entity.js'
import { EXAM_TYPES } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type { MyExam } from '../../../application/use-cases/list-my-exams/list-my-exams.use-case.js'

const MY_EXAM_STATUSES = [
  'UPCOMING',
  'OPEN',
  'IN_PROGRESS',
  'FINISHED',
] as const

const EXAM_LIFECYCLES = ['UPCOMING', 'OPEN', 'FINISHED'] as const

export class MyExamDto {
  @ApiProperty({ format: 'uuid', description: 'The schedule id' }) id!: string
  @ApiProperty() title!: string
  @ApiProperty({ format: 'uuid' }) subjectId!: string
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Null when academic-service cannot name the subject right now',
  })
  subjectName!: string | null
  @ApiProperty({ enum: EXAM_TYPES }) type!: MyExam['type']
  @ApiProperty({ format: 'date-time' }) startsAt!: string
  @ApiProperty({ format: 'date-time' }) endsAt!: string
  @ApiProperty() durationMinutes!: number
  @ApiProperty() minSubmitMinutes!: number
  @ApiProperty({ enum: MY_EXAM_STATUSES }) status!: MyExam['status']
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  sessionId!: string | null
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'The activity this exam belongs to, when it belongs to one',
  })
  activityId!: string | null
  @ApiProperty({ enum: ACTIVITY_STATUSES, nullable: true })
  activityStatus!: MyExam['activityStatus']
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  eventId!: string | null
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Null when the event cannot be named right now',
  })
  eventName!: string | null
  @ApiProperty({ enum: EXAM_LIFECYCLES }) lifecycle!: MyExam['lifecycle']
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Only filled while the exam is open',
  })
  roomName!: string | null
  @ApiProperty({ type: Number, nullable: true })
  seatNumber!: number | null
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Only filled while the exam is open; null when none was issued',
  })
  participantNumber!: string | null
  @ApiProperty({ description: 'True for a makeup sitting' })
  makeup!: boolean

  static fromDomain(domain: MyExam): MyExamDto {
    const dto = new MyExamDto()
    dto.id = domain.id
    dto.title = domain.title
    dto.subjectId = domain.subjectId
    dto.subjectName = domain.subjectName
    dto.type = domain.type
    dto.startsAt = domain.startsAt.toISOString()
    dto.endsAt = domain.endsAt.toISOString()
    dto.durationMinutes = domain.durationMinutes
    dto.minSubmitMinutes = domain.minSubmitMinutes
    dto.status = domain.status
    dto.sessionId = domain.sessionId
    dto.activityId = domain.activityId
    dto.activityStatus = domain.activityStatus
    dto.eventId = domain.eventId
    dto.eventName = domain.eventName
    dto.lifecycle = domain.lifecycle
    dto.roomName = domain.roomName
    dto.seatNumber = domain.seatNumber
    dto.participantNumber = domain.participantNumber
    dto.makeup = domain.makeup
    return dto
  }
}
