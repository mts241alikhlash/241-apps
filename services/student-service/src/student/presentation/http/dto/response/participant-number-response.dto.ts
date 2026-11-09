import { ApiProperty } from '@nestjs/swagger'

export class ParticipantNumberResponseDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Registry number for the semester, or null when none was issued',
  })
  number!: string | null

  static fromDomain(number: string | null): ParticipantNumberResponseDto {
    const dto = new ParticipantNumberResponseDto()
    dto.number = number
    return dto
  }
}
