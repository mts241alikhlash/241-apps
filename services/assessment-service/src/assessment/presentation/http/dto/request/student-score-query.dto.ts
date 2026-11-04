import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsUUID } from 'class-validator'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'

export class StudentScoreQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() enrollmentId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID() assessmentItemId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID() semesterId?: string
}
