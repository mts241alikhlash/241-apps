import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'

@Injectable()
export class IssueParticipantNumbersUseCase {
  private readonly logger = new Logger(IssueParticipantNumbersUseCase.name)

  constructor(
    private readonly activities: ExamActivityRepository,
    private readonly participants: IParticipantNumberPort,
  ) {}

  async execute(activityId: string): Promise<{ issued: boolean }> {
    const activity = await this.activities.findById(activityId)
    if (activity === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    try {
      await this.participants.issueNumbers(activity.semesterId)
      return { issued: true }
    } catch (error) {
      this.logger.warn(
        `Participant numbers unavailable for semester ${activity.semesterId}: ${(error as Error).message}`,
      )
      return { issued: false }
    }
  }
}
