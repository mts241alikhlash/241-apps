import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsUUID } from 'class-validator'
import type {
  PrintPack,
  PrintPackRoom,
  PrintPackStudent,
} from '../../../application/use-cases/get-print-pack/get-print-pack.use-case.js'

export class PrintPackQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  roomId?: string
}

export class PrintPackStudentDto {
  @ApiProperty() seatNumber!: number
  @ApiProperty({ format: 'uuid' }) studentId!: string
  @ApiProperty({ type: String, nullable: true }) name!: string | null
  @ApiProperty({ type: String, nullable: true }) nis!: string | null
  @ApiProperty({ type: String, nullable: true })
  classroomName!: string | null
  @ApiProperty({ type: String, nullable: true })
  participantNumber!: string | null

  static fromDomain(domain: PrintPackStudent): PrintPackStudentDto {
    const dto = new PrintPackStudentDto()
    dto.seatNumber = domain.seatNumber
    dto.studentId = domain.studentId
    dto.name = domain.name
    dto.nis = domain.nis
    dto.classroomName = domain.classroomName
    dto.participantNumber = domain.participantNumber
    return dto
  }
}

export class PrintPackTechnicianDto {
  @ApiProperty({ type: String, nullable: true }) name!: string | null
}

export class PrintPackSupervisorDto {
  @ApiProperty({ format: 'date-time' }) startsAt!: string
  @ApiProperty({ format: 'date-time' }) endsAt!: string
  @ApiProperty({ type: String, nullable: true }) name!: string | null
}

export class PrintPackRoomDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty() code!: string
  @ApiProperty() name!: string
  @ApiProperty({ type: String, nullable: true }) building!: string | null
  @ApiProperty({ type: () => PrintPackTechnicianDto, nullable: true })
  technician!: PrintPackTechnicianDto | null
  @ApiProperty({ type: () => [PrintPackSupervisorDto] })
  supervisors!: PrintPackSupervisorDto[]
  @ApiProperty({ type: () => [PrintPackStudentDto] })
  students!: PrintPackStudentDto[]

  static fromDomain(domain: PrintPackRoom): PrintPackRoomDto {
    const dto = new PrintPackRoomDto()
    dto.id = domain.id
    dto.code = domain.code
    dto.name = domain.name
    dto.building = domain.building
    dto.technician =
      domain.technician === null ? null : { name: domain.technician.name }
    dto.supervisors = domain.supervisors.map((slot) => ({
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      name: slot.name,
    }))
    dto.students = domain.students.map((student) =>
      PrintPackStudentDto.fromDomain(student),
    )
    return dto
  }
}

export class PrintPackDto {
  @ApiProperty({
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      startsAt: { type: 'string', format: 'date-time' },
      endsAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'name', 'startsAt', 'endsAt'],
  })
  event!: { id: string; name: string; startsAt: string; endsAt: string }
  @ApiProperty({ type: () => [PrintPackRoomDto] })
  rooms!: PrintPackRoomDto[]
  @ApiProperty({ type: [String] })
  warnings!: string[]

  static fromDomain(domain: PrintPack): PrintPackDto {
    const dto = new PrintPackDto()
    dto.event = {
      id: domain.event.id,
      name: domain.event.name,
      startsAt: domain.event.startsAt.toISOString(),
      endsAt: domain.event.endsAt.toISOString(),
    }
    dto.rooms = domain.rooms.map((room) => PrintPackRoomDto.fromDomain(room))
    dto.warnings = domain.warnings
    return dto
  }
}
