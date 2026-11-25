import { ApiProperty } from '@nestjs/swagger'
import type { RdmImportResult } from '../../../../domain/rdm-import.repository.js'

export class RdmImportResponseDto {
  @ApiProperty({ type: Number })
  itemsCreated!: number

  @ApiProperty({ type: Number })
  itemsUpdated!: number

  @ApiProperty({ type: Number })
  scoresWritten!: number

  static fromDomain(domain: RdmImportResult): RdmImportResponseDto {
    const dto = new RdmImportResponseDto()
    dto.itemsCreated = domain.itemsCreated
    dto.itemsUpdated = domain.itemsUpdated
    dto.scoresWritten = domain.scoresWritten
    return dto
  }
}
