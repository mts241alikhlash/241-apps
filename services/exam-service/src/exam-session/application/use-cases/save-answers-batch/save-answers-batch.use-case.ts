import { BadRequestException, Injectable } from '@nestjs/common'
import { ApiConflictException } from '../../../../core/filters/api-exception.js'
import { IExamPackageRepository } from '../../../../exam-package/domain/repositories/exam-package.repository.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IQuestionRepository } from '../../../../question/domain/repositories/question.repository.js'
import {
  TIME_UP_MESSAGE,
  isWorkingTimeOver,
} from '../../../domain/policies/session-times.policy.js'
import { assertAnswerShape } from '../../../domain/policies/validate-answer-shape.policy.js'
import {
  IExamSessionRepository,
  type SkippedAnswerBatchItem,
} from '../../../domain/repositories/exam-session.repository.js'
import { AnswerShapeCache, loadAnswerShapes } from '../../answer-shapes.js'
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
  dndGranted?: boolean
  lockTaskActive?: boolean
  batteryUnrestricted?: boolean
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
  private readonly shapes = new AnswerShapeCache()

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
    carriedBySubmit = false,
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
    if (!carriedBySubmit && isWorkingTimeOver(session, now)) {
      throw new ApiConflictException('TIME_UP', TIME_UP_MESSAGE)
    }

    const latest = new Map<string, SaveAnswerBatchInputItem>()
    for (const item of input.answers) latest.set(item.questionId, item)

    const shapes = await loadAnswerShapes(
      this.schedules,
      this.packages,
      this.questions,
      session.scheduleId,
      this.shapes,
    )
    const receivedAfterDeadline = now.getTime() >= session.deadline.getTime()

    const items = [...latest.values()].map((item) => {
      const shape = shapes.get(item.questionId)
      if (shape === undefined) {
        throw new BadRequestException('Soal bukan bagian dari ujian ini')
      }
      return {
        questionId: item.questionId,
        clientId: item.clientId,
        answer: assertAnswerShape(shape.type, shape.content, item.answer),
        receivedAfterDeadline,
      }
    })

    const { saved, skipped, totalConfirmedCount } =
      await this.sessions.saveAnswersBatch(session.id, items, {
        now,
        unsyncedCount: input.pendingLocalCount,
        batteryLevel: input.batteryLevel,
        isCharging: input.isCharging,
        dndGranted: input.dndGranted,
        lockTaskActive: input.lockTaskActive,
        batteryUnrestricted: input.batteryUnrestricted,
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
