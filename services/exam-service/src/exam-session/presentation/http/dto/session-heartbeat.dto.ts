import { ApiProperty } from '@nestjs/swagger'

export class SessionHeartbeatDto {
  @ApiProperty() lockedByViolation!: boolean
  @ApiProperty() requiresTokenReentry!: boolean
  @ApiProperty({ nullable: true, type: String })
  absentSince!: string | null
  @ApiProperty() serverTime!: string
}
