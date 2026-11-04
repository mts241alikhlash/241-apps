import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { CleanupExpiredSnapshotsUseCase } from '../../application/use-cases/cleanup-expired-snapshots/cleanup-expired-snapshots.use-case.js'

@Injectable()
export class ProctorSnapshotCleanupJob {
  private running = false

  constructor(private readonly useCase: CleanupExpiredSnapshotsUseCase) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.useCase.execute()
    } finally {
      this.running = false
    }
  }
}
