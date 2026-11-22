import type { ExamAnswerRecord } from '../../exam-session/domain/entities/exam-session.entity.js'
import type { QuestionType } from '../../question/domain/value-objects/question-content.js'
import type { PaperSource } from '../../exam-session/domain/policies/build-paper.policy.js'

export interface GradingItem {
  questionId: string
  number: number
  type: QuestionType
  manual: boolean
  bodyHtml: string
  points: number
  guideHtml: string | null
  acceptedAnswers: string[] | null
  choices: { key: string; html: string }[] | null
  correctKeys: string[] | null
  correctValue: boolean | null
  answer: ExamAnswerRecord['answer'] | null
  score: number | null
  note: string | null
  gradedAt: Date | null
  needsGrading: boolean
}

export const isManual = (type: string): type is 'SHORT_ANSWER' | 'ESSAY' =>
  type === 'SHORT_ANSWER' || type === 'ESSAY'

export const isBlankAnswer = (answer: ExamAnswerRecord | null): boolean =>
  answer === null ||
  ('text' in answer.answer && answer.answer.text.trim() === '')

export function toGradingItem(
  source: PaperSource,
  number: number,
  answer: ExamAnswerRecord | null,
): GradingItem {
  const manual = isManual(source.type)
  const content = (
    source.resolution === 'KEY_OVERRIDE' && source.overrideContent != null
      ? source.overrideContent
      : source.content
  ) as {
    guideHtml?: string | null
    choices?: { key: string; html: string }[]
    answer?: {
      accepted?: string[]
      key?: string
      keys?: string[]
      value?: boolean
    }
  }
  return {
    questionId: source.questionId,
    number,
    type: source.type,
    manual,
    bodyHtml: source.bodyHtml,
    points: source.points,
    guideHtml: source.type === 'ESSAY' ? (content.guideHtml ?? null) : null,
    acceptedAnswers:
      source.type === 'SHORT_ANSWER' ? (content.answer?.accepted ?? []) : null,
    choices: content.choices
      ? content.choices.map(({ key, html }) => ({ key, html }))
      : null,
    correctKeys:
      source.type === 'MULTIPLE_CHOICE' && content.answer?.key
        ? [content.answer.key]
        : source.type === 'MULTIPLE_RESPONSE'
          ? (content.answer?.keys ?? [])
          : null,
    correctValue:
      source.type === 'TRUE_FALSE' ? (content.answer?.value ?? null) : null,
    answer: answer?.answer ?? null,
    score:
      manual || source.resolution === 'BONUS_ALL'
        ? source.resolution === 'BONUS_ALL'
          ? source.points
          : (answer?.score ?? null)
        : (answer?.score ?? 0),
    note: answer?.gradeNote ?? null,
    gradedAt: answer?.gradedAt ?? null,
    needsGrading: manual && !isBlankAnswer(answer) && answer?.score === null,
  }
}
