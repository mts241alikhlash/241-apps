import { ApiProperty } from '@nestjs/swagger'
import { IsIn } from 'class-validator'
import { CAMERA_BLOCKED_REASONS } from '../../../application/use-cases/report-camera-blocked/report-camera-blocked.use-case.js'

export class CameraBlockedDto {
  @ApiProperty({ enum: CAMERA_BLOCKED_REASONS })
  @IsIn(CAMERA_BLOCKED_REASONS)
  reason!: (typeof CAMERA_BLOCKED_REASONS)[number]
}
