import { ApiProperty } from '@nestjs/swagger'
import type { AssetDashboard } from '../use-cases/get-asset-dashboard.use-case.js'

export class InventoryNamedTotalResponseDto {
  @ApiProperty({ type: String })
  name!: string

  @ApiProperty({ type: Number })
  total!: number
}

export class AssetDashboardResponseDto {
  @ApiProperty({ type: Number })
  total!: number

  @ApiProperty({ type: () => [InventoryNamedTotalResponseDto] })
  byStatus!: InventoryNamedTotalResponseDto[]

  @ApiProperty({ type: () => [InventoryNamedTotalResponseDto] })
  byCondition!: InventoryNamedTotalResponseDto[]

  static fromDomain(domain: AssetDashboard): AssetDashboardResponseDto {
    const dto = new AssetDashboardResponseDto()
    dto.total = domain.total
    dto.byStatus = domain.byStatus.map((row) => ({
      name: row.name,
      total: row.total,
    }))
    dto.byCondition = domain.byCondition.map((row) => ({
      name: row.name,
      total: row.total,
    }))
    return dto
  }
}

export class LoanDashboardResponseDto {
  @ApiProperty({ type: Number })
  active!: number

  @ApiProperty({ type: Number })
  overdue!: number

  static fromDomain(domain: {
    active: number
    overdue: number
  }): LoanDashboardResponseDto {
    const dto = new LoanDashboardResponseDto()
    dto.active = domain.active
    dto.overdue = domain.overdue
    return dto
  }
}
