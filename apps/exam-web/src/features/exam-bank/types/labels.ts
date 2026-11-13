import type { QuestionType } from './question'

const TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Pilihan Ganda',
  MULTIPLE_RESPONSE: 'Pilihan Ganda Kompleks',
  TRUE_FALSE: 'Benar/Salah',
  SHORT_ANSWER: 'Isian Singkat',
  ESSAY: 'Uraian',
}

const TYPE_CODES: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'PG',
  MULTIPLE_RESPONSE: 'PGK',
  TRUE_FALSE: 'BS',
  SHORT_ANSWER: 'IS',
  ESSAY: 'UR',
}

export const typeLabel = (type: QuestionType): string => TYPE_LABELS[type]

export const typeCode = (type: QuestionType): string => TYPE_CODES[type]
