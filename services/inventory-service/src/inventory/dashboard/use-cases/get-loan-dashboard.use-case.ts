import { Injectable } from '@nestjs/common'
import { IInventoryDashboardRepository } from '../domain/inventory-dashboard.repository.js'

@Injectable()
export class GetLoanDashboardUseCase {
  constructor(private readonly dashboard: IInventoryDashboardRepository) {}

  async execute(): Promise<{ active: number; overdue: number }> {
    const now = new Date()
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    )
    const [active, overdue] = await Promise.all([
      this.dashboard.countActiveLoans(),
      this.dashboard.countLoansDueBefore(today),
    ])
    return { active, overdue }
  }
}
