import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, Length } from 'class-validator'
import type { ItemResolution } from '../../../../domain/entities/exam-package.entity.js'
import type { AdjustedPackageItemKey } from '../../../../application/use-cases/adjust-package-item-key/adjust-package-item-key.use-case.js'

const RESOLUTIONS: readonly ItemResolution[] = [
  'NORMAL',
  'BONUS_ALL',
  'KEY_OVERRIDE',
]

export class AdjustPackageItemKeyDto {
  @ApiProperty({ enum: RESOLUTIONS })
  @IsIn(RESOLUTIONS)
  resolution!: ItemResolution

  @ApiPropertyOptional({
    description:
      'The replacement answer key; required for KEY_OVERRIDE, ignored otherwise',
  })
  @IsOptional()
  overrideContent?: unknown

  @ApiProperty({ minLength: 5, maxLength: 300 })
  @IsString()
  @Length(5, 300)
  reason!: string
}

export class AdjustedPackageItemKeyDto {
  @ApiProperty({ format: 'uuid' }) packageId!: string
  @ApiProperty({ format: 'uuid' }) questionId!: string
  @ApiProperty({ enum: RESOLUTIONS }) resolution!: ItemResolution
  @ApiProperty({
    description: 'Finished sessions whose scores were recomputed',
  })
  rescoredSessions!: number

  static fromDomain(domain: AdjustedPackageItemKey): AdjustedPackageItemKeyDto {
    const dto = new AdjustedPackageItemKeyDto()
    dto.packageId = domain.packageId
    dto.questionId = domain.questionId
    dto.resolution = domain.resolution
    dto.rescoredSessions = domain.rescoredSessions
    return dto
  }
}
