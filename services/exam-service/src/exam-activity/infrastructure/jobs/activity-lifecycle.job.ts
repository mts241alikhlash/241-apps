import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AdvanceActivityStatusUseCase } from '../../application/use-cases/advance-activity-status/advance-activity-status.use-case.js'

@Injectable()
export class ActivityLifecycleJob {
  private readonly logger = new Logger(ActivityLifecycleJob.name)
  private running = false
  private lastBlocked = ''

  constructor(private readonly useCase: AdvanceActivityStatusUseCase) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      const { opened, closed, blocked } = await this.useCase.execute(new Date())
      if (opened.length > 0) {
        this.logger.log(
          `Kegiatan dibuka otomatis (AUTO_OPEN): ${opened.join(', ')}`,
        )
      }
      if (closed.length > 0) {
        this.logger.log(
          `Kegiatan ditutup otomatis (AUTO_CLOSE): ${closed.join(', ')}`,
        )
      }
      const blockedKey = [...blocked].sort().join(',')
      if (blockedKey !== this.lastBlocked) {
        if (blocked.length > 0) {
          this.logger.warn(
            `Kegiatan belum bisa dibuka otomatis, paket soal belum siap: ${blocked.join(', ')}`,
          )
        }
        this.lastBlocked = blockedKey
      }
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
