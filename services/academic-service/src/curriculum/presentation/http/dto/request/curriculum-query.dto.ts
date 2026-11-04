import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'
import { toBooleanFromTransform } from '@mts241alikhlash/nest-core/validators'

export class CurriculaQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by curricula name' })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({
    description: 'Filter by Academic Year ID',
    example: '550e8400-e29b-41d4-a716-446655440009',
  })
  @IsOptional()
  @IsUUID()
  academicYearId?: string

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(toBooleanFromTransform)
  @IsBoolean()
  isActive?: boolean
}
