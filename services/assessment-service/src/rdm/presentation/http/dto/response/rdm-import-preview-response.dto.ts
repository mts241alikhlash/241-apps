import { ApiProperty } from '@nestjs/swagger'
import type {
  RdmImportPreviewResult,
  RdmImportRowIssue,
  RdmImportSheetPreview,
} from '../../../../application/rdm.types.js'

export class RdmImportSheetPreviewDto {
  @ApiProperty({ type: String })
  sheetName!: string

  @ApiProperty({ type: String })
  name!: string

  @ApiProperty({ enum: ['create', 'update'] })
  action!: 'create' | 'update'

  @ApiProperty({ type: String, nullable: true })
  itemId!: string | null

  @ApiProperty({ type: Number })
  scoresToWrite!: number

  @ApiProperty({ type: Number })
  unchanged!: number

  static fromDomain(domain: RdmImportSheetPreview): RdmImportSheetPreviewDto {
    const dto = new RdmImportSheetPreviewDto()
    dto.sheetName = domain.sheetName
    dto.name = domain.name
    dto.action = domain.action
    dto.itemId = domain.itemId
    dto.scoresToWrite = domain.scoresToWrite
    dto.unchanged = domain.unchanged
    return dto
  }
}

export class RdmImportRowIssueDto {
  @ApiProperty({ type: String })
  sheetName!: string

  @ApiProperty({ type: Number })
  row!: number

  static fromDomain(domain: RdmImportRowIssue): RdmImportRowIssueDto {
    const dto = new RdmImportRowIssueDto()
    dto.sheetName = domain.sheetName
    dto.row = domain.row
    return dto
  }
}

export class RdmImportPreviewDto {
  @ApiProperty({ type: String, nullable: true })
  classSubjectWarning!: string | null

  @ApiProperty({ type: () => [RdmImportSheetPreviewDto] })
  sheets!: RdmImportSheetPreviewDto[]

  @ApiProperty({ type: () => [RdmImportRowIssueDto] })
  unmatchedRows!: RdmImportRowIssueDto[]

  @ApiProperty({ type: () => [RdmImportRowIssueDto] })
  invalidValues!: RdmImportRowIssueDto[]

  static fromDomain(domain: RdmImportPreviewResult): RdmImportPreviewDto {
    const dto = new RdmImportPreviewDto()
    dto.classSubjectWarning = domain.classSubjectWarning
    dto.sheets = domain.sheets.map((sheet) =>
      RdmImportSheetPreviewDto.fromDomain(sheet),
    )
    dto.unmatchedRows = domain.unmatchedRows.map((issue) =>
      RdmImportRowIssueDto.fromDomain(issue),
    )
    dto.invalidValues = domain.invalidValues.map((issue) =>
      RdmImportRowIssueDto.fromDomain(issue),
    )
    return dto
  }
}
