import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../core/database/prisma.service.js'
import {
  IInventoryDashboardRepository,
  NamedTotal,
} from '../domain/inventory-dashboard.repository.js'

@Injectable()
export class PrismaInventoryDashboardRepository extends IInventoryDashboardRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async countUnitsByStatus(): Promise<NamedTotal[]> {
    const groups = await this.prisma.inventoryAssetUnit.groupBy({
      by: ['statusId'],
      where: { deletedAt: null },
      _count: { _all: true },
    })
    const statuses = await this.prisma.inventoryStatus.findMany({
      where: { id: { in: groups.map((g) => g.statusId) } },
      select: { id: true, name: true },
    })
    return groups.map((group) => ({
      name: statuses.find((s) => s.id === group.statusId)?.name ?? '-',
      total: group._count._all,
    }))
  }

  async countUnitsByCondition(): Promise<NamedTotal[]> {
    const groups = await this.prisma.inventoryAssetUnit.groupBy({
      by: ['conditionId'],
      where: { deletedAt: null },
      _count: { _all: true },
    })
    const conditions = await this.prisma.inventoryCondition.findMany({
      where: { id: { in: groups.map((g) => g.conditionId) } },
      select: { id: true, name: true },
    })
    return groups.map((group) => ({
      name: conditions.find((c) => c.id === group.conditionId)?.name ?? '-',
      total: group._count._all,
    }))
  }

  private async openLoanWhere() {
    const status = await this.prisma.inventoryStatus.findUnique({
      where: { systemKey: 'LOANED' },
      select: { id: true },
    })
    return { actualReturnDate: null, statusId: status?.id ?? '' }
  }

  async countActiveLoans(): Promise<number> {
    return this.prisma.inventoryLoan.count({
      where: await this.openLoanWhere(),
    })
  }

  async countLoansDueBefore(day: Date): Promise<number> {
    return this.prisma.inventoryLoan.count({
      where: {
        ...(await this.openLoanWhere()),
        expectedReturnDate: { lt: day },
      },
    })
  }
}
