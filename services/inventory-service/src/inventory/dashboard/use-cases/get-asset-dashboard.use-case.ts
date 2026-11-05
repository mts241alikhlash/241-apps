import { Injectable } from '@nestjs/common'
import {
  IInventoryDashboardRepository,
  NamedTotal,
} from '../domain/inventory-dashboard.repository.js'

export interface AssetDashboard {
  total: number
  byStatus: NamedTotal[]
  byCondition: NamedTotal[]
}

@Injectable()
export class GetAssetDashboardUseCase {
  constructor(private readonly dashboard: IInventoryDashboardRepository) {}

  async execute(): Promise<AssetDashboard> {
    const [byStatus, byCondition] = await Promise.all([
      this.dashboard.countUnitsByStatus(),
      this.dashboard.countUnitsByCondition(),
    ])
    return {
      total: byStatus.reduce((sum, row) => sum + row.total, 0),
      byStatus,
      byCondition,
    }
  }
}
