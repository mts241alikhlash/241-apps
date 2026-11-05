import { Injectable } from '@nestjs/common'
import { PresenceDayStatusEnum } from '../../daily-record/domain/entities/daily-presence.entity.js'
import { IDailyPresenceRepository } from '../../daily-record/domain/interfaces/daily-presence-repository.interface.js'
import { ILeaveRepository } from '../../leave/domain/interfaces/leave-repository.interface.js'
import { dayOf } from '../../shared/day.js'
import { ServerClockService } from '../../shared/services/server-clock.service.js'

export interface MyPresenceDashboard {
  today: {
    status: PresenceDayStatusEnum
    clockIn: Date | null
    clockOut: Date | null
  } | null
  leaveBalance: { leaveTypeName: string; remainingDays: number }[]
}

@Injectable()
export class GetMyPresenceDashboardUseCase {
  constructor(
    private readonly presence: IDailyPresenceRepository,
    private readonly leave: ILeaveRepository,
    private readonly clock: ServerClockService,
  ) {}

  async execute(
    userId: string,
    canReadLeave: boolean,
  ): Promise<MyPresenceDashboard> {
    const now = this.clock.now()
    const day = await this.presence.findByUserAndDate(userId, dayOf(now))
    const balances = canReadLeave
      ? await this.leave.findBalances(userId, now.getUTCFullYear())
      : []
    return {
      today: day
        ? {
            status: day.status,
            clockIn: day.checkInAt ?? null,
            clockOut: day.checkOutAt ?? null,
          }
        : null,
      leaveBalance: balances.map((row) => ({
        leaveTypeName: row.name,
        remainingDays: row.remaining,
      })),
    }
  }
}
