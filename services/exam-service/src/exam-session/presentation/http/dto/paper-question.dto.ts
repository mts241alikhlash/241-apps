import { ApiProperty } from '@nestjs/swagger'
import type { PaperQuestion } from '../../../domain/policies/build-paper.policy.js'
import type { PaperView } from '../../../application/use-cases/get-paper/get-paper.use-case.js'
import type { SavedAnswer } from '../../../application/use-cases/list-saved-answers/list-saved-answers.use-case.js'
import {
  ANSWER_PAYLOAD_MODELS,
  ANSWER_PAYLOAD_SCHEMA,
  type AnswerPayloadDto,
} from './answer-payload.dto.js'

const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_RESPONSE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'ESSAY',
] as const

export class PaperChoiceDto {
  @ApiProperty({ enum: ['A', 'B', 'C', 'D', 'E'] }) key!: string
  @ApiProperty() html!: string
}

export class PaperQuestionDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ description: 'Position on this student paper, from 1' })
  number!: number
  @ApiProperty({ enum: QUESTION_TYPES }) type!: PaperQuestion['type']
  @ApiProperty() bodyHtml!: string
  @ApiProperty() points!: number
  @ApiProperty({ type: [PaperChoiceDto], nullable: true })
  choices!: PaperChoiceDto[] | null

  static fromDomain(domain: PaperQuestion): PaperQuestionDto {
    const dto = new PaperQuestionDto()
    dto.id = domain.questionId
    dto.number = domain.number
    dto.type = domain.type
    dto.bodyHtml = domain.bodyHtml
    dto.points = domain.points
    dto.choices = domain.choices
    return dto
  }
}

export class SessionPaperDto {
  @ApiProperty({ type: () => [PaperQuestionDto] })
  questions!: PaperQuestionDto[]
  @ApiProperty({ format: 'date-time' }) startedAt!: string
  @ApiProperty() minSubmitMinutes!: number
  @ApiProperty({ format: 'date-time' }) serverTime!: string

  static fromDomain(domain: PaperView): SessionPaperDto {
    const dto = new SessionPaperDto()
    dto.questions = domain.questions.map((question) =>
      PaperQuestionDto.fromDomain(question),
    )
    dto.startedAt = domain.startedAt.toISOString()
    dto.minSubmitMinutes = domain.minSubmitMinutes
    dto.serverTime = domain.serverTime.toISOString()
    return dto
  }
}

@ANSWER_PAYLOAD_MODELS
export class SavedAnswerDto {
  @ApiProperty({ format: 'uuid' }) questionId!: string
  @ApiProperty(ANSWER_PAYLOAD_SCHEMA)
  answer!: AnswerPayloadDto

  static fromDomain(domain: SavedAnswer): SavedAnswerDto {
    const dto = new SavedAnswerDto()
    dto.questionId = domain.questionId
    dto.answer = { ...domain.answer }
    return dto
  }
}
