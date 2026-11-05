import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import {
  IEmployeeSummaryReadPort,
  NamedTotal,
} from '../../../domain/repositories/employee-summary-read.port.js'

@Injectable()
export class PrismaEmployeeSummaryReadPort extends IEmployeeSummaryReadPort {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  countActive(): Promise<number> {
    return this.prisma.employee.count({ where: { deletedAt: null } })
  }

  async countByEmploymentType(): Promise<NamedTotal[]> {
    const groups = await this.prisma.employee.groupBy({
      by: ['employmentTypeId'],
      where: { deletedAt: null },
      _count: { _all: true },
    })
    const types = await this.prisma.employmentType.findMany({
      where: { id: { in: groups.map((g) => g.employmentTypeId) } },
      select: { id: true, name: true },
    })
    return groups.map((group) => ({
      name: types.find((t) => t.id === group.employmentTypeId)?.name ?? '-',
      total: group._count._all,
    }))
  }

  async countByPositionCategory(): Promise<NamedTotal[]> {
    const groups = await this.prisma.employeePosition.groupBy({
      by: ['positionId'],
      where: {
        isPrimary: true,
        deletedAt: null,
        employee: { deletedAt: null },
      },
      _count: { _all: true },
    })
    const positions = await this.prisma.position.findMany({
      where: { id: { in: groups.map((g) => g.positionId) } },
      select: { id: true, category: { select: { name: true } } },
    })
    const totals = new Map<string, number>()
    for (const group of groups) {
      const name =
        positions.find((p) => p.id === group.positionId)?.category.name ?? '-'
      totals.set(name, (totals.get(name) ?? 0) + group._count._all)
    }
    return [...totals].map(([name, total]) => ({ name, total }))
  }
}
