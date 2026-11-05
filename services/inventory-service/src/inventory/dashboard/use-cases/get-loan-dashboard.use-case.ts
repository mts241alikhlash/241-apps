import { SchoolTimeService } from '@mts241alikhlash/nest-core/time'
import { Injectable } from '@nestjs/common'
import { IInventoryDashboardRepository } from '../domain/inventory-dashboard.repository.js'

@Injectable()
export class GetLoanDashboardUseCase {
  constructor(
    private readonly dashboard: IInventoryDashboardRepository,
    private readonly schoolTime: SchoolTimeService,
  ) {}

  async execute(): Promise<{ active: number; overdue: number }> {
    const today = this.schoolTime.today()
    const [active, overdue] = await Promise.all([
      this.dashboard.countActiveLoans(),
      this.dashboard.countLoansDueBefore(today),
    ])
    return { active, overdue }
  }
}
