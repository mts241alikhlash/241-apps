import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PublishOfflineScoresUseCase } from '../../application/use-cases/publish-offline-scores/publish-offline-scores.use-case.js'

@Injectable()
export class PublishOfflineScoresJob {
  private running = false

  constructor(private readonly useCase: PublishOfflineScoresUseCase) {}

  @Cron(CronExpression.EVERY_MINUTE)
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
