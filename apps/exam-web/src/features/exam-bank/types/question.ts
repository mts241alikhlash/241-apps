export const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_RESPONSE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'ESSAY',
] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]

export const CHOICE_KEYS = ['A', 'B', 'C', 'D', 'E'] as const

export type ChoiceKey = (typeof CHOICE_KEYS)[number]

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

export interface QuestionVersion {
  id: string
  questionId: string
  number: number
  bodyHtml: string
  content: QuestionContent
  points: number
  createdById: string
  createdAt: string
}

export interface QuestionDetail {
  id: string
  packageId: string
  type: QuestionType
  currentVersion: number
  current: QuestionVersion
}
