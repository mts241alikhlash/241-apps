import { SchoolTimeModule } from '@mts241alikhlash/nest-core/time'
import { Module } from '@nestjs/common'
import { StudentIdentityModule } from '../platform/student-identity/student-identity.module.js'
import { EmployeeIdentityModule } from '../platform/employee-identity/employee-identity.module.js'
import { IMyDashboardRepository } from './domain/repositories/my-dashboard.repository.js'
import { PrismaMyDashboardRepository } from './infrastructure/persistence/prisma/prisma-my-dashboard.repository.js'
import { IInstitutionDashboardRepository } from './domain/repositories/institution-dashboard.repository.js'
import { PrismaInstitutionDashboardRepository } from './infrastructure/persistence/prisma/prisma-institution-dashboard.repository.js'
import { GetInstitutionDashboardUseCase } from './application/use-cases/get-institution-dashboard/get-institution-dashboard.use-case.js'
import { MyDashboardController } from './presentation/http/my-dashboard.controller.js'
import { GetMyDashboardUseCase } from './application/use-cases/get-my-dashboard/get-my-dashboard.use-case.js'

@Module({
  imports: [SchoolTimeModule, StudentIdentityModule, EmployeeIdentityModule],
  controllers: [MyDashboardController],
  providers: [
    {
      provide: IMyDashboardRepository,
      useClass: PrismaMyDashboardRepository,
    },
    {
      provide: IInstitutionDashboardRepository,
      useClass: PrismaInstitutionDashboardRepository,
    },
    GetMyDashboardUseCase,
    GetInstitutionDashboardUseCase,
  ],
})
export class MyDashboardModule {}
