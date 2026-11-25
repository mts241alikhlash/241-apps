import { ApiProperty } from '@nestjs/swagger'
import type {
  FillRdmTemplateResult,
  RdmFillSheetSummary,
  RdmFillSummary,
  RdmItemRef,
} from '../../../../application/rdm.types.js'
import type { RdmKind } from '../../../../domain/rdm-rules.js'

export class RdmFillSheetSummaryDto {
  @ApiProperty({ type: String })
  sheetName!: string

  @ApiProperty({ type: String })
  itemId!: string

  @ApiProperty({ type: String })
  itemName!: string

  @ApiProperty({ type: Number })
  written!: number

  static fromDomain(domain: RdmFillSheetSummary): RdmFillSheetSummaryDto {
    const dto = new RdmFillSheetSummaryDto()
    dto.sheetName = domain.sheetName
    dto.itemId = domain.itemId
    dto.itemName = domain.itemName
    dto.written = domain.written
    return dto
  }
}

export class RdmItemRefDto {
  @ApiProperty({ type: String })
  id!: string

  @ApiProperty({ type: String })
  name!: string

  static fromDomain(domain: RdmItemRef): RdmItemRefDto {
    const dto = new RdmItemRefDto()
    dto.id = domain.id
    dto.name = domain.name
    return dto
  }
}

export class RdmFillSummaryDto {
  @ApiProperty({ enum: ['sumatif', 'sas'] })
  kind!: RdmKind

  @ApiProperty({ type: String, nullable: true })
  classSubjectWarning!: string | null

  @ApiProperty({ type: () => [RdmFillSheetSummaryDto] })
  sheets!: RdmFillSheetSummaryDto[]

  @ApiProperty({ type: [Number] })
  unmatchedRows!: number[]

  @ApiProperty({ type: [Number] })
  ambiguousRows!: number[]

  @ApiProperty({ type: [String] })
  missingStudents!: string[]

  @ApiProperty({ type: () => [RdmItemRefDto] })
  itemsNotSent!: RdmItemRefDto[]

  static fromDomain(domain: RdmFillSummary): RdmFillSummaryDto {
    const dto = new RdmFillSummaryDto()
    dto.kind = domain.kind
    dto.classSubjectWarning = domain.classSubjectWarning
    dto.sheets = domain.sheets.map((sheet) =>
      RdmFillSheetSummaryDto.fromDomain(sheet),
    )
    dto.unmatchedRows = [...domain.unmatchedRows]
    dto.ambiguousRows = [...domain.ambiguousRows]
    dto.missingStudents = [...domain.missingStudents]
    dto.itemsNotSent = domain.itemsNotSent.map((item) =>
      RdmItemRefDto.fromDomain(item),
    )
    return dto
  }
}

export class RdmFillResponseDto {
  @ApiProperty({ type: String })
  fileName!: string

  @ApiProperty({ type: String })
  fileBase64!: string

  @ApiProperty({ type: () => RdmFillSummaryDto })
  summary!: RdmFillSummaryDto

  static fromDomain(domain: FillRdmTemplateResult): RdmFillResponseDto {
    const dto = new RdmFillResponseDto()
    dto.fileName = domain.fileName
    dto.fileBase64 = domain.fileBase64
    dto.summary = RdmFillSummaryDto.fromDomain(domain.summary)
    return dto
  }
}
