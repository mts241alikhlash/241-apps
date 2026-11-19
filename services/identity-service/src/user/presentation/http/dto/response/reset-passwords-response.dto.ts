import { ApiProperty } from '@nestjs/swagger'

export class ResetPasswordEntryDto {
  @ApiProperty({ format: 'uuid' }) userId!: string
  @ApiProperty() identifier!: string
  @ApiProperty({ description: 'Shown once; never stored' })
  password!: string
}

export class ResetPasswordsResponseDto {
  @ApiProperty({ type: () => [ResetPasswordEntryDto] })
  data!: ResetPasswordEntryDto[]
}
