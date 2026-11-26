import { ApiPropertyOptional } from '@nestjs/swagger'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import { Transform } from 'class-transformer'
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'

export class AssessmentItemQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() teachingAssignmentId?: string

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Comma-separated on the query string',
  })
  @IsOptional()
  @Transform(({ value }): string[] | undefined => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      const items = value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
      return items.length > 0 ? items : undefined
    }
    return undefined
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  teachingAssignmentIds?: string[]

  @ApiPropertyOptional({ enum: AssessmentType })
  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType
}
