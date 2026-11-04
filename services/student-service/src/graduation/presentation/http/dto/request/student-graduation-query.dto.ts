import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsUUID } from 'class-validator'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'

export class StudentGraduationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  academicYearId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string
}
