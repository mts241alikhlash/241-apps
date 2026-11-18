import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator'
import { toBooleanFromTransform } from '@mts241alikhlash/nest-core/validators'
import type { ImportPreview } from '../../../application/use-cases/import-questions/import-questions.input.js'

export class ImportQuestionsDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() packageId!: string
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(toBooleanFromTransform)
  @IsBoolean()
  confirmDuplicates?: boolean
}

export class ImportTemplateQueryDto {
  @ApiProperty({ enum: ['xlsx', 'docx'] })
  @IsIn(['xlsx', 'docx'])
  format!: 'xlsx' | 'docx'
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
  @ApiProperty({ type: () => ImportCountsDto }) points!: ImportCountsDto
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
    dto.points = Object.assign(new ImportCountsDto(), preview.points)
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
