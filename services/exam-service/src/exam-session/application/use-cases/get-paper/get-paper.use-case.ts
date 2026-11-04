import { Injectable } from '@nestjs/common'
import { IExamPackageRepository } from '../../../../exam-package/domain/repositories/exam-package.repository.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IQuestionRepository } from '../../../../question/domain/repositories/question.repository.js'
import {
  buildPaper,
  type PaperQuestion,
} from '../../../domain/policies/build-paper.policy.js'
import { loadPaperSources } from '../../load-paper-sources.js'
import {
  SessionAccessService,
  type SessionActor,
} from '../../session-access.service.js'

export interface PaperView {
  questions: PaperQuestion[]
  startedAt: Date
  minSubmitMinutes: number
  serverTime: Date
}

@Injectable()
export class GetPaperUseCase {
  constructor(
    private readonly access: SessionAccessService,
    private readonly schedules: IExamScheduleRepository,
    private readonly packages: IExamPackageRepository,
    private readonly questions: IQuestionRepository,
  ) {}

  async execute(
    user: SessionActor,
    sessionId: string,
    now: Date = new Date(),
  ): Promise<PaperView> {
    const session = await this.access.loadReadable(user, sessionId, now)
    const sources = await loadPaperSources(
      this.schedules,
      this.packages,
      this.questions,
      session.scheduleId,
    )
    const schedule = await this.schedules.findById(session.scheduleId)
    return {
      questions: buildPaper(sources, session.shuffleSeed),
      startedAt: session.startedAt,
      minSubmitMinutes: schedule?.minSubmitMinutes ?? 0,
      serverTime: now,
    }
  }
}
