import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger'
import { CHOICE_KEYS } from '../../../../question/domain/value-objects/question-content.js'
import type { AnswerPayload } from '../../../domain/policies/validate-answer-shape.policy.js'

export class KeyAnswerPayloadDto {
  @ApiProperty({ enum: CHOICE_KEYS }) key!: AnswerPayloadKey
}

export class KeysAnswerPayloadDto {
  @ApiProperty({ enum: CHOICE_KEYS, isArray: true }) keys!: AnswerPayloadKey[]
}

export class ValueAnswerPayloadDto {
  @ApiProperty() value!: boolean
}

export class TextAnswerPayloadDto {
  @ApiProperty() text!: string
}

type AnswerPayloadKey = Extract<AnswerPayload, { key: unknown }>['key']

export type AnswerPayloadDto = AnswerPayload

export const ANSWER_PAYLOAD_MODELS = ApiExtraModels(
  KeyAnswerPayloadDto,
  KeysAnswerPayloadDto,
  ValueAnswerPayloadDto,
  TextAnswerPayloadDto,
)

export const ANSWER_PAYLOAD_SCHEMA = {
  oneOf: [
    { $ref: getSchemaPath(KeyAnswerPayloadDto) },
    { $ref: getSchemaPath(KeysAnswerPayloadDto) },
    { $ref: getSchemaPath(ValueAnswerPayloadDto) },
    { $ref: getSchemaPath(TextAnswerPayloadDto) },
  ],
  description: 'One of { key } | { keys } | { value } | { text }',
}
