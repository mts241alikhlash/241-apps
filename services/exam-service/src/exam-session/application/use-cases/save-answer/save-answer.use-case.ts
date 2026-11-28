import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common'
import { ApiConflictException } from '../../../../core/filters/api-exception.js'
import { IExamPackageRepository } from '../../../../exam-package/domain/repositories/exam-package.repository.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IQuestionRepository } from '../../../../question/domain/repositories/question.repository.js'
import type { ExamAnswerRecord } from '../../../domain/entities/exam-session.entity.js'
import { assertAnswerShape } from '../../../domain/policies/validate-answer-shape.policy.js'
import {
  TIME_UP_MESSAGE,
  isWorkingTimeOver,
} from '../../../domain/policies/session-times.policy.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'
import { AnswerShapeCache, loadAnswerShapes } from '../../answer-shapes.js'
import {
  SessionAccessService,
  type SessionActor,
} from '../../session-access.service.js'

export interface SaveAnswerInput {
  questionId: string
  clientId: string
  answer: unknown
}

@Injectable()
export class SaveAnswerUseCase {
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
    input: SaveAnswerInput,
    now: Date = new Date(),
  ): Promise<ExamAnswerRecord> {
    const session = await this.access.loadWritable(user, sessionId, now)
    if (
      session.status !== 'IN_PROGRESS' ||
      now.getTime() >= session.finalizeAt.getTime()
    ) {
      throw new ConflictException('Waktu pengiriman jawaban sudah habis')
    }
    if (isWorkingTimeOver(session, now)) {
      throw new ApiConflictException('TIME_UP', TIME_UP_MESSAGE)
    }

    const replay = await this.sessions.findAnswerByClientId(
      session.id,
      input.clientId,
    )
    if (replay !== null) {
      if (replay.questionId !== input.questionId) {
        throw new ConflictException('Client id sudah dipakai untuk soal lain')
      }
      return replay
    }

    const shapes = await loadAnswerShapes(
      this.schedules,
      this.packages,
      this.questions,
      session.scheduleId,
      this.shapes,
    )
    const shape = shapes.get(input.questionId)
    if (shape === undefined) {
      throw new BadRequestException('Soal bukan bagian dari ujian ini')
    }
    const answer = assertAnswerShape(shape.type, shape.content, input.answer)

    const saved = await this.sessions.upsertAnswer({
      sessionId: session.id,
      questionId: input.questionId,
      clientId: input.clientId,
      answer,
      receivedAfterDeadline: now.getTime() >= session.deadline.getTime(),
    })
    if (saved === null) {
      throw new ConflictException('Waktu pengiriman jawaban sudah habis')
    }
    return saved
  }
}
