import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator'

export class ListParticipantNumbersQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  semesterId!: string

  @ApiProperty({
    type: String,
    description: 'Comma separated student ids, at most 500',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((id) => id.trim()) : value,
  )
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  studentIds!: string[]
}
