import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import type { SebConfig } from '../../../domain/entities/seb-config.entity.js'

export class CreateSebConfigDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @ApiProperty({ description: '64 hex characters from the SEB configuration' })
  @IsString()
  configKey!: string
}

export class UpdateSebConfigDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean
}

export class SebConfigDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty() name!: string
  @ApiProperty() configKey!: string
  @ApiProperty() active!: boolean
  @ApiProperty() createdAt!: Date
  @ApiProperty() updatedAt!: Date

  static fromDomain(domain: SebConfig): SebConfigDto {
    const dto = new SebConfigDto()
    dto.id = domain.id
    dto.name = domain.name
    dto.configKey = domain.configKey
    dto.active = domain.active
    dto.createdAt = domain.createdAt
    dto.updatedAt = domain.updatedAt
    return dto
  }
}

export class ActiveSebConfigDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty() name!: string

  static fromDomain(domain: SebConfig): ActiveSebConfigDto {
    const dto = new ActiveSebConfigDto()
    dto.id = domain.id
    dto.name = domain.name
    return dto
  }
}

export class SebProofDto {
  @ApiProperty({
    description: '64 hex characters, SHA-256 of page URL and config key',
  })
  @IsString()
  @Length(64, 64)
  @Matches(/^[0-9a-fA-F]{64}$/)
  configKeyHash!: string

  @ApiProperty({ maxLength: 2048 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  pageUrl!: string
}

export class CheckSebRequestDto {
  @ApiPropertyOptional({ type: SebProofDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SebProofDto)
  seb?: SebProofDto
}

export class CheckSebResponseDto {
  @ApiProperty() matched!: boolean
  @ApiProperty({ nullable: true, type: String }) configName!: string | null
}
