import { ApiProperty } from '@nestjs/swagger'
import type { EmployeeSummary } from '../../../../application/use-cases/get-employee-summary/get-employee-summary.use-case.js'

export class NamedTotalResponseDto {
  @ApiProperty({ type: String })
  name!: string

  @ApiProperty({ type: Number })
  total!: number
}

export class EmployeeSummaryResponseDto {
  @ApiProperty({ type: Number })
  activeTotal!: number

  @ApiProperty({ type: () => [NamedTotalResponseDto] })
  byEmploymentType!: NamedTotalResponseDto[]

  @ApiProperty({ type: () => [NamedTotalResponseDto] })
  byPositionCategory!: NamedTotalResponseDto[]

  static fromDomain(domain: EmployeeSummary): EmployeeSummaryResponseDto {
    const dto = new EmployeeSummaryResponseDto()
    dto.activeTotal = domain.activeTotal
    dto.byEmploymentType = domain.byEmploymentType.map((row) => ({
      name: row.name,
      total: row.total,
    }))
    dto.byPositionCategory = domain.byPositionCategory.map((row) => ({
      name: row.name,
      total: row.total,
    }))
    return dto
  }
}
