import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'

export class SubjectQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by subject name or code' })
  @IsOptional()
  @IsString()
  search?: string
}
