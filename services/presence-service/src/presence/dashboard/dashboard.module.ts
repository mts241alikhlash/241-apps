import { Module } from '@nestjs/common'
import { DailyRecordModule } from '../daily-record/daily-record.module.js'
import { LeaveModule } from '../leave/leave.module.js'
import { PresenceSharedModule } from '../shared/presence-shared.module.js'
import { IPresenceDashboardRepository } from './domain/presence-dashboard-repository.interface.js'
import { PrismaPresenceDashboardRepository } from './infrastructure/prisma-presence-dashboard.repository.js'
import { PresenceDashboardController } from './presentation/presence-dashboard.controller.js'
import { GetAttendanceTodayUseCase } from './use-cases/get-attendance-today.use-case.js'
import { GetMyPresenceDashboardUseCase } from './use-cases/get-my-presence-dashboard.use-case.js'
import { GetPendingLeavesUseCase } from './use-cases/get-pending-leaves.use-case.js'

@Module({
  imports: [DailyRecordModule, LeaveModule, PresenceSharedModule],
  controllers: [PresenceDashboardController],
  providers: [
    {
      provide: IPresenceDashboardRepository,
      useClass: PrismaPresenceDashboardRepository,
    },
    GetAttendanceTodayUseCase,
    GetPendingLeavesUseCase,
    GetMyPresenceDashboardUseCase,
  ],
})
export class DashboardModule {}
