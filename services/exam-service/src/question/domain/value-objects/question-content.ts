export const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_RESPONSE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'ESSAY',
] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]

export type ChoiceKey = 'A' | 'B' | 'C' | 'D' | 'E'

export const CHOICE_KEYS: readonly ChoiceKey[] = ['A', 'B', 'C', 'D', 'E']

export interface Choice {
  key: ChoiceKey
  html: string
}

export interface MultipleChoiceContent {
  choices: Choice[]
  answer: { key: ChoiceKey }
}

export interface MultipleResponseContent {
  choices: Choice[]
  answer: { keys: ChoiceKey[] }
}

export interface TrueFalseContent {
  answer: { value: boolean }
}

export interface ShortAnswerContent {
  answer: {
    accepted: string[]
    ignoreCase: boolean
    ignoreHarakat: boolean
  }
}

export interface EssayContent {
  guideHtml: string | null
}

export type QuestionContent =
  | MultipleChoiceContent
  | MultipleResponseContent
  | TrueFalseContent
  | ShortAnswerContent
  | EssayContent

export function applyKeyOverride(
  content: QuestionContent,
  override: unknown,
): QuestionContent {
  if (typeof override !== 'object' || override === null) return content
  const patch = override as Record<string, unknown>
  const base = content as unknown as Record<string, unknown>
  const answer =
    typeof base.answer === 'object' && base.answer !== null
      ? (base.answer as Record<string, unknown>)
      : null
  const overrideAnswer =
    typeof patch.answer === 'object' && patch.answer !== null
      ? (patch.answer as Record<string, unknown>)
      : null
  return {
    ...base,
    ...patch,
    ...(answer !== null && overrideAnswer !== null
      ? { answer: { ...answer, ...overrideAnswer } }
      : {}),
  } as QuestionContent
}
