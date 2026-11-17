import { ApiProperty } from '@nestjs/swagger'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator'

export class LookupParticipantNumbersDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  semesterId!: string

  @ApiProperty({ type: [String], minItems: 1, maxItems: 500 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  studentIds!: string[]
}
