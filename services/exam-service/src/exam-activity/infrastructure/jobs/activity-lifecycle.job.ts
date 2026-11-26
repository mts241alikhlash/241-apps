import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AdvanceActivityStatusUseCase } from '../../application/use-cases/advance-activity-status/advance-activity-status.use-case.js'

@Injectable()
export class ActivityLifecycleJob {
  private readonly logger = new Logger(ActivityLifecycleJob.name)
  private running = false

  constructor(private readonly useCase: AdvanceActivityStatusUseCase) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.useCase.execute(new Date())
    } catch (error) {
      this.logger.error(
        'Pergantian status otomatis kegiatan gagal',
        error instanceof Error ? error.stack : String(error),
      )
    } finally {
      this.running = false
    }
  }
}
