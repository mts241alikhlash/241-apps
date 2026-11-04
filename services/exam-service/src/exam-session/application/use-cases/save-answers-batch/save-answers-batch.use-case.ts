import { BadRequestException, Injectable } from '@nestjs/common'
import { ApiConflictException } from '../../../../core/filters/api-exception.js'
import { IExamPackageRepository } from '../../../../exam-package/domain/repositories/exam-package.repository.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IQuestionRepository } from '../../../../question/domain/repositories/question.repository.js'
import { assertAnswerShape } from '../../../domain/policies/validate-answer-shape.policy.js'
import {
  IExamSessionRepository,
  type SkippedAnswerBatchItem,
} from '../../../domain/repositories/exam-session.repository.js'
import { loadPaperSources } from '../../load-paper-sources.js'
import {
  SessionAccessService,
  type SessionActor,
} from '../../session-access.service.js'

export interface SaveAnswerBatchInputItem {
  questionId: string
  clientId: string
  answer: unknown
}

export interface SaveAnswersBatchInput {
  answers: SaveAnswerBatchInputItem[]
  pendingLocalCount?: number
  batteryLevel?: number
  isCharging?: boolean
}

export interface ConfirmedAnswer {
  questionId: string
  clientId: string
  updatedAt: Date
  receivedAfterDeadline: boolean
}

export interface SaveAnswersBatchResult {
  confirmed: ConfirmedAnswer[]
  skipped: SkippedAnswerBatchItem[]
  confirmedCount: number
  serverTime: Date
}

@Injectable()
export class SaveAnswersBatchUseCase {
  constructor(
    private readonly access: SessionAccessService,
    private readonly schedules: IExamScheduleRepository,
    private readonly packages: IExamPackageRepository,
    private readonly questions: IQuestionRepository,
    private readonly sessions: IExamSessionRepository,
  ) {}

  async execute(
    user: SessionActor,
    sessionId: string,
    input: SaveAnswersBatchInput,
    now: Date = new Date(),
  ): Promise<SaveAnswersBatchResult> {
    const session = await this.access.loadWritable(user, sessionId, now)
    if (
      session.status !== 'IN_PROGRESS' ||
      now.getTime() >= session.finalizeAt.getTime()
    ) {
      throw new ApiConflictException(
        'WINDOW_CLOSED',
        'Waktu pengiriman jawaban sudah habis',
      )
    }

    const latest = new Map<string, SaveAnswerBatchInputItem>()
    for (const item of input.answers) latest.set(item.questionId, item)

    const sources = await loadPaperSources(
      this.schedules,
      this.packages,
      this.questions,
      session.scheduleId,
    )
    const sourceOf = new Map(sources.map((row) => [row.questionId, row]))
    const receivedAfterDeadline = now.getTime() >= session.deadline.getTime()

    const items = [...latest.values()].map((item) => {
      const source = sourceOf.get(item.questionId)
      if (source === undefined) {
        throw new BadRequestException('Soal bukan bagian dari ujian ini')
      }
      return {
        questionId: item.questionId,
        clientId: item.clientId,
        answer: assertAnswerShape(source.type, source.content, item.answer),
        receivedAfterDeadline,
      }
    })

    const { saved, skipped, totalConfirmedCount } =
      await this.sessions.saveAnswersBatch(session.id, items, {
        now,
        unsyncedCount: input.pendingLocalCount,
        batteryLevel: input.batteryLevel,
        isCharging: input.isCharging,
      })

    return {
      confirmed: saved.map(({ questionId, clientId, updatedAt }) => ({
        questionId,
        clientId,
        updatedAt,
        receivedAfterDeadline,
      })),
      skipped,
      confirmedCount: totalConfirmedCount,
      serverTime: now,
    }
  }
}
