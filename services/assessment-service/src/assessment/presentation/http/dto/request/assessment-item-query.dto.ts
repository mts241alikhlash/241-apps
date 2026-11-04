import { ApiPropertyOptional } from '@nestjs/swagger'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import { IsEnum, IsOptional, IsUUID } from 'class-validator'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'

export class AssessmentItemQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() teachingAssignmentId?: string
  @ApiPropertyOptional({ enum: AssessmentType })
  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType
}
