import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../core/database/prisma.service.js'
import { PresenceSubjectTypeEnum } from '../../credential/domain/entities/credential.entity.js'
import {
  IPresenceDashboardRepository,
  StatusCounts,
} from '../domain/presence-dashboard-repository.interface.js'

@Injectable()
export class PrismaPresenceDashboardRepository extends IPresenceDashboardRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async countStatusesOn(
    date: Date,
    subjectType: PresenceSubjectTypeEnum,
  ): Promise<StatusCounts> {
    const rows = await this.prisma.dailyPresence.groupBy({
      by: ['status'],
      where: { date, subjectType, deletedAt: null },
      _count: { _all: true },
    })
    return Object.fromEntries(rows.map((row) => [row.status, row._count._all]))
  }

  countActiveCredentialHolders(
    subjectType: PresenceSubjectTypeEnum,
  ): Promise<number> {
    return this.prisma.presenceCredential.count({
      where: { subjectType, status: 'ACTIVE', deletedAt: null },
    })
  }

  countPendingLeaveRequests(): Promise<number> {
    return this.prisma.leaveRequest.count({
      where: { status: 'PENDING', deletedAt: null },
    })
  }
}
