import { ApiProperty } from '@nestjs/swagger'
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator'

export class ResetPasswordsDto {
  @ApiProperty({ type: [String], format: 'uuid', maxItems: 500 })
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  userIds!: string[]
}
