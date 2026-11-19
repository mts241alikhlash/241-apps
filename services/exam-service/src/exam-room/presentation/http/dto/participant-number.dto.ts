import { ApiProperty } from '@nestjs/swagger'
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator'

export class IssueSemesterNumbersBodyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  semesterId!: string
}

export class IssueSemesterNumbersResponseDto {
  @ApiProperty({ description: 'How many numbers this call created' })
  issued!: number

  @ApiProperty({
    type: [String],
    description: 'Students without a grade level, so they got no number',
  })
  skipped!: string[]
}

export class LookupParticipantNumbersBodyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  semesterId!: string

  @ApiProperty({ type: [String], format: 'uuid', maxItems: 1000 })
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('all', { each: true })
  studentIds!: string[]
}

export class ParticipantNumberItemDto {
  @ApiProperty({ format: 'uuid' }) studentId!: string
  @ApiProperty() number!: string
}

export class LookupParticipantNumbersResponseDto {
  @ApiProperty({ type: [ParticipantNumberItemDto] })
  items!: ParticipantNumberItemDto[]
}
