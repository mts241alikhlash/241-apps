import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator'
import { AdmissionPaymentStatus } from '@mts241alikhlash/nest-core/domain'

export class VerifyPaymentDto {
  @ApiProperty({ enum: ['VERIFIED', 'REJECTED'] })
  @IsEnum(AdmissionPaymentStatus)
  @IsIn(['VERIFIED', 'REJECTED'])
  status: AdmissionPaymentStatus

  @ApiPropertyOptional({
    description: 'Required when the decision is REJECTED',
  })
  @IsOptional()
  @IsString()
  note?: string
}
