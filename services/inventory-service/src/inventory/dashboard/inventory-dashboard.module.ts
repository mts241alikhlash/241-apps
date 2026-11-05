import { Module } from '@nestjs/common'
import { IInventoryDashboardRepository } from './domain/inventory-dashboard.repository.js'
import { PrismaInventoryDashboardRepository } from './infrastructure/prisma-inventory-dashboard.repository.js'
import { InventoryDashboardController } from './presentation/inventory-dashboard.controller.js'
import { GetAssetDashboardUseCase } from './use-cases/get-asset-dashboard.use-case.js'
import { GetLoanDashboardUseCase } from './use-cases/get-loan-dashboard.use-case.js'

@Module({
  controllers: [InventoryDashboardController],
  providers: [
    {
      provide: IInventoryDashboardRepository,
      useClass: PrismaInventoryDashboardRepository,
    },
    GetAssetDashboardUseCase,
    GetLoanDashboardUseCase,
  ],
})
export class InventoryDashboardModule {}
