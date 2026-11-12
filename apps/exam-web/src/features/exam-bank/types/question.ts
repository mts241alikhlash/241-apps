import type { components } from '@mts241alikhlash/exam-api'

type Schemas = components['schemas']

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

export type Choice = Schemas['ChoiceDto']

export type MultipleChoiceContent = Schemas['MultipleChoiceContentDto']

export type MultipleResponseContent = Schemas['MultipleResponseContentDto']

export type TrueFalseContent = Schemas['TrueFalseContentDto']

export type ShortAnswerContent = Schemas['ShortAnswerContentDto']

export type EssayContent = Schemas['EssayContentDto']

export type QuestionVersion = Schemas['QuestionVersionDto']

export type QuestionContent = QuestionVersion['content']

export type QuestionDetail = Schemas['QuestionDetailDto']
