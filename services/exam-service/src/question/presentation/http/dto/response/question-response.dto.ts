import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger'
import type {
  QuestionDetail,
  QuestionVersion,
} from '../../../../domain/entities/question.entity.js'
import {
  CHOICE_KEYS,
  QUESTION_TYPES,
  type ChoiceKey,
  type QuestionType,
} from '../../../../domain/value-objects/question-content.js'
import type { QuestionScopeView } from '../../../../application/use-cases/get-question-scope/get-question-scope.use-case.js'

class ChoiceDto {
  @ApiProperty({ enum: CHOICE_KEYS }) key!: ChoiceKey
  @ApiProperty() html!: string
}

class SingleKeyAnswerDto {
  @ApiProperty({ enum: CHOICE_KEYS }) key!: ChoiceKey
}

class MultiKeyAnswerDto {
  @ApiProperty({ enum: CHOICE_KEYS, isArray: true }) keys!: ChoiceKey[]
}

class BooleanAnswerDto {
  @ApiProperty() value!: boolean
}

class ShortAnswerAnswerDto {
  @ApiProperty({ type: [String] }) accepted!: string[]
  @ApiProperty() ignoreCase!: boolean
  @ApiProperty() ignoreHarakat!: boolean
}

export class MultipleChoiceContentDto {
  @ApiProperty({ type: () => [ChoiceDto] }) choices!: ChoiceDto[]
  @ApiProperty({ type: () => SingleKeyAnswerDto }) answer!: SingleKeyAnswerDto
}

export class MultipleResponseContentDto {
  @ApiProperty({ type: () => [ChoiceDto] }) choices!: ChoiceDto[]
  @ApiProperty({ type: () => MultiKeyAnswerDto }) answer!: MultiKeyAnswerDto
}

export class TrueFalseContentDto {
  @ApiProperty({ type: () => BooleanAnswerDto }) answer!: BooleanAnswerDto
}

export class ShortAnswerContentDto {
  @ApiProperty({ type: () => ShortAnswerAnswerDto })
  answer!: ShortAnswerAnswerDto
}

export class EssayContentDto {
  @ApiProperty({ type: String, nullable: true }) guideHtml!: string | null
}

export type QuestionContentDto =
  | MultipleChoiceContentDto
  | MultipleResponseContentDto
  | TrueFalseContentDto
  | ShortAnswerContentDto
  | EssayContentDto

@ApiExtraModels(
  MultipleChoiceContentDto,
  MultipleResponseContentDto,
  TrueFalseContentDto,
  ShortAnswerContentDto,
  EssayContentDto,
)
export class QuestionVersionDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ format: 'uuid' }) questionId!: string
  @ApiProperty() number!: number
  @ApiProperty() bodyHtml!: string
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(MultipleChoiceContentDto) },
      { $ref: getSchemaPath(MultipleResponseContentDto) },
      { $ref: getSchemaPath(TrueFalseContentDto) },
      { $ref: getSchemaPath(ShortAnswerContentDto) },
      { $ref: getSchemaPath(EssayContentDto) },
    ],
  })
  content!: QuestionContentDto
  @ApiProperty() points!: number
  @ApiProperty({ format: 'uuid' }) createdById!: string
  @ApiProperty({ format: 'date-time' }) createdAt!: string

  static fromDomain(domain: QuestionVersion): QuestionVersionDto {
    const dto = new QuestionVersionDto()
    dto.id = domain.id
    dto.questionId = domain.questionId
    dto.number = domain.number
    dto.bodyHtml = domain.bodyHtml
    dto.content = domain.content
    dto.points = domain.points
    dto.createdById = domain.createdById
    dto.createdAt = domain.createdAt.toISOString()
    return dto
  }
}

export class QuestionDetailDto {
  @ApiProperty({ format: 'uuid' }) id!: string
  @ApiProperty({ format: 'uuid' }) subjectId!: string
  @ApiProperty({ format: 'uuid' }) gradeId!: string
  @ApiProperty({ format: 'uuid' }) authorEmployeeId!: string
  @ApiProperty({ enum: QUESTION_TYPES }) type!: QuestionType
  @ApiProperty({ format: 'uuid' }) packageId!: string
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  copiedFromQuestionId!: string | null
  @ApiProperty() currentVersion!: number
  @ApiProperty() revision!: number
  @ApiProperty({ format: 'uuid' }) createdById!: string
  @ApiProperty({ format: 'date-time' }) createdAt!: string
  @ApiProperty({ format: 'date-time' }) updatedAt!: string
  @ApiProperty({ type: () => QuestionVersionDto }) current!: QuestionVersionDto

  static fromDomain(domain: QuestionDetail): QuestionDetailDto {
    const dto = new QuestionDetailDto()
    dto.id = domain.id
    dto.subjectId = domain.subjectId
    dto.gradeId = domain.gradeId
    dto.authorEmployeeId = domain.authorEmployeeId
    dto.type = domain.type
    dto.packageId = domain.packageId
    dto.copiedFromQuestionId = domain.copiedFromQuestionId
    dto.currentVersion = domain.currentVersion
    dto.revision = domain.revision
    dto.createdById = domain.createdById
    dto.createdAt = domain.createdAt.toISOString()
    dto.updatedAt = domain.updatedAt.toISOString()
    dto.current = QuestionVersionDto.fromDomain(domain.current)
    return dto
  }
}

export class ScopePairDto {
  @ApiProperty({ format: 'uuid' }) subjectId!: string
  @ApiProperty({ type: String, nullable: true }) subjectName!: string | null
  @ApiProperty({ format: 'uuid' }) gradeId!: string
  @ApiProperty({ type: Number, nullable: true }) gradeLevel!: number | null
  @ApiProperty({ type: String, nullable: true }) gradeName!: string | null
}

export class QuestionScopeDto {
  @ApiProperty() all!: boolean
  @ApiProperty({ type: String, nullable: true }) employeeId!: string | null
  @ApiProperty({ type: () => [ScopePairDto] }) pairs!: ScopePairDto[]

  static fromDomain(domain: QuestionScopeView): QuestionScopeDto {
    const dto = new QuestionScopeDto()
    dto.all = domain.all
    dto.employeeId = domain.employeeId
    dto.pairs = domain.pairs.map((pair) =>
      Object.assign(new ScopePairDto(), pair),
    )
    return dto
  }
}
