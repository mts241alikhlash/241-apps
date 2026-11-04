import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus'
import { HEALTH_DATABASE, type HealthDatabase } from './health-database.js'

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly health: HealthIndicatorService,
    @Inject(HEALTH_DATABASE) private readonly prisma: HealthDatabase,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key)
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return indicator.up()
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : 'Unknown DB error',
      })
    }
  }
}
