import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsInt, IsUUID, Max, Min } from 'class-validator'
import {
  CALL_SUSPENSION_REASONS,
  MAX_SUSPENSION_SECONDS,
  MIN_SUSPENSION_SECONDS,
  type CallSuspensionReason,
  type CallSuspensionWindow,
} from '../../../application/use-cases/suspend-session/suspend-session.use-case.js'

export class SessionSuspensionRequestDto {
  @ApiProperty({ enum: CALL_SUSPENSION_REASONS })
  @IsIn(CALL_SUSPENSION_REASONS)
  reason!: CallSuspensionReason

  @ApiProperty({
    minimum: MIN_SUSPENSION_SECONDS,
    maximum: MAX_SUSPENSION_SECONDS,
  })
  @IsInt()
  @Min(MIN_SUSPENSION_SECONDS)
  @Max(MAX_SUSPENSION_SECONDS)
  seconds!: number

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  clientId!: string
}

export class SessionSuspensionDto {
  @ApiProperty({ format: 'date-time' }) deadline!: string
  @ApiProperty({ format: 'date-time' }) finalizeAt!: string
  @ApiProperty({ description: 'Minutes this report added to the session' })
  extraMinutes!: number
  @ApiProperty() suspendedSeconds!: number

  static fromDomain(domain: CallSuspensionWindow): SessionSuspensionDto {
    const dto = new SessionSuspensionDto()
    dto.deadline = domain.deadline.toISOString()
    dto.finalizeAt = domain.finalizeAt.toISOString()
    dto.extraMinutes = domain.extraMinutes
    dto.suspendedSeconds = domain.suspendedSeconds
    return dto
  }
}
