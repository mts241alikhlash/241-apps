import { Injectable } from '@nestjs/common'
import { IPresenceDashboardRepository } from '../domain/presence-dashboard-repository.interface.js'

@Injectable()
export class GetPendingLeavesUseCase {
  constructor(private readonly dashboard: IPresenceDashboardRepository) {}

  async execute(): Promise<{ total: number }> {
    return { total: await this.dashboard.countPendingLeaveRequests() }
  }
}
