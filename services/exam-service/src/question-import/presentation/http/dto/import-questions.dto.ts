import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator'
import { toBooleanFromTransform } from '@mts241alikhlash/nest-core/validators'
import { STANDARD_COUNTS } from '../../../domain/import-standard.js'
import type { ImportPreview } from '../../../application/use-cases/import-questions/import-questions.input.js'

export class ImportQuestionsDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() packageId!: string
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(toBooleanFromTransform)
  @IsBoolean()
  confirmDuplicates?: boolean
}

function CountProperty(fallback: number) {
  return function decorate(target: object, key: string): void {
    ApiPropertyOptional({ minimum: 0, maximum: 100, default: fallback })(
      target,
      key,
    )
    IsOptional()(target, key)
    Type(() => Number)(target, key)
    IsInt()(target, key)
    Min(0)(target, key)
    Max(100)(target, key)
  }
}

export class ImportTemplateQueryDto {
  @ApiProperty({ enum: ['xlsx', 'docx'] })
  @IsIn(['xlsx', 'docx'])
  format!: 'xlsx' | 'docx'

  @ApiPropertyOptional({ enum: ['table', 'vertical'] })
  @IsOptional()
  @IsIn(['table', 'vertical'])
  layout?: 'table' | 'vertical'

  @CountProperty(STANDARD_COUNTS.MULTIPLE_CHOICE)
  pg?: number

  @CountProperty(STANDARD_COUNTS.MULTIPLE_RESPONSE)
  pgKompleks?: number

  @CountProperty(STANDARD_COUNTS.TRUE_FALSE)
  benarSalah?: number

  @CountProperty(STANDARD_COUNTS.SHORT_ANSWER)
  isian?: number

  @CountProperty(STANDARD_COUNTS.ESSAY)
  uraian?: number
}

export class ImportErrorDto {
  @ApiProperty() row!: number
  @ApiProperty() reason!: string
}

export class ImportResultDto {
  @ApiProperty() created!: number
  @ApiProperty({ type: [String] }) questionIds!: string[]
  @ApiProperty({ type: () => [ImportErrorDto] }) errors!: ImportErrorDto[]

  static fromDomain(domain: {
    created: number
    questionIds: string[]
    errors: { row: number; reason: string }[]
  }): ImportResultDto {
    const dto = new ImportResultDto()
    dto.created = domain.created
    dto.questionIds = domain.questionIds
    dto.errors = domain.errors.map((error) => {
      const row = new ImportErrorDto()
      row.row = error.row
      row.reason = error.reason
      return row
    })
    return dto
  }
}

export class SheetIdentityDto {
  @ApiProperty({ type: Number, nullable: true }) version!: number | null
  @ApiProperty() teacherName!: string
  @ApiProperty() nik!: string
  @ApiProperty() subjectName!: string
  @ApiProperty({ type: Number, nullable: true }) gradeLevel!: number | null
}

export class ImportCountsDto {
  @ApiProperty() MULTIPLE_CHOICE!: number
  @ApiProperty() MULTIPLE_RESPONSE!: number
  @ApiProperty() TRUE_FALSE!: number
  @ApiProperty() SHORT_ANSWER!: number
  @ApiProperty() ESSAY!: number
}

export class ImportPreviewDto {
  @ApiProperty({ type: () => SheetIdentityDto }) identity!: SheetIdentityDto
  @ApiProperty({ type: String, nullable: true }) authorName!: string | null
  @ApiProperty({ type: () => ImportCountsDto }) counts!: ImportCountsDto
  @ApiProperty() totalPoints!: number
  @ApiProperty() total!: number
  @ApiProperty({ type: () => [ImportErrorDto] }) errors!: ImportErrorDto[]
  @ApiProperty({ type: [String] }) warnings!: string[]
  @ApiProperty({ type: [Number] }) duplicateRows!: number[]
  @ApiProperty() canSave!: boolean

  static fromDomain(preview: ImportPreview): ImportPreviewDto {
    const dto = new ImportPreviewDto()
    dto.identity = Object.assign(new SheetIdentityDto(), preview.identity)
    dto.authorName = preview.authorName
    dto.counts = Object.assign(new ImportCountsDto(), preview.counts)
    dto.totalPoints = preview.totalPoints
    dto.total = preview.total
    dto.errors = preview.errors.map((error) =>
      Object.assign(new ImportErrorDto(), error),
    )
    dto.warnings = preview.warnings
    dto.duplicateRows = preview.duplicateRows
    dto.canSave = preview.canSave
    return dto
  }
}
