import { ApiProperty } from '@nestjs/swagger'

export class ParticipantNumberEntryDto {
  @ApiProperty({ format: 'uuid' }) studentId!: string

  @ApiProperty() number!: string
}

export class ListParticipantNumbersResponseDto {
  @ApiProperty({ type: [ParticipantNumberEntryDto] })
  data!: ParticipantNumberEntryDto[]
}
