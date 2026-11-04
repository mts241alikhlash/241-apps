import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'

export class AcademicYearQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by academic year name' })
  @IsOptional()
  @IsString()
  search?: string
}
