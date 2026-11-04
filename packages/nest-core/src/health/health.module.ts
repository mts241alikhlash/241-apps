import { DynamicModule, Module, Type } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { HealthController } from './health.controller.js'
import { HEALTH_DATABASE, type HealthDatabase } from './health-database.js'
import { PrismaHealthIndicator } from './prisma.health.js'

@Module({})
export class HealthModule {
  static forRoot(database: Type<HealthDatabase>): DynamicModule {
    return {
      module: HealthModule,
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        PrismaHealthIndicator,
        { provide: HEALTH_DATABASE, useExisting: database },
      ],
    }
  }
}
