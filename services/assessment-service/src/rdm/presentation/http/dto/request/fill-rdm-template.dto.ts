import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsArray, IsOptional, IsUUID } from 'class-validator'

export class FillRdmTemplateDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teachingAssignmentId!: string

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') return undefined
    return Array.isArray(value) ? (value as unknown[]) : [value]
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  itemIds?: string[]
}
