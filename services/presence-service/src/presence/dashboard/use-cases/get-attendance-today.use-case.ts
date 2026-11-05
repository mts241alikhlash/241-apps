import { Injectable } from '@nestjs/common'
import { dayOf } from '../../shared/day.js'
import { ServerClockService } from '../../shared/services/server-clock.service.js'
import { IPresenceDashboardRepository } from '../domain/presence-dashboard-repository.interface.js'

export interface AttendanceToday {
  present: number
  late: number
  onLeave: number
  notScanned: number
  date: Date
}

@Injectable()
export class GetAttendanceTodayUseCase {
  constructor(
    private readonly dashboard: IPresenceDashboardRepository,
    private readonly clock: ServerClockService,
  ) {}

  async execute(): Promise<AttendanceToday> {
    const date = dayOf(this.clock.now())
    const [counts, holders] = await Promise.all([
      this.dashboard.countStatusesOn(date, 'EMPLOYEE'),
      this.dashboard.countActiveCredentialHolders('EMPLOYEE'),
    ])
    const present = counts.PRESENT ?? 0
    const late = counts.LATE ?? 0
    const onLeave = (counts.ON_LEAVE ?? 0) + (counts.OFFICIAL_DUTY ?? 0)
    const accounted = present + late + onLeave + (counts.NOT_EXPECTED ?? 0)
    return {
      present,
      late,
      onLeave,
      notScanned: Math.max(0, holders - accounted),
      date,
    }
  }
}
