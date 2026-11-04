import type { QuestionType } from './question'

const TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Pilihan Ganda',
  MULTIPLE_RESPONSE: 'Pilihan Ganda Kompleks',
  TRUE_FALSE: 'Benar/Salah',
  SHORT_ANSWER: 'Isian Singkat',
  ESSAY: 'Uraian',
}

export const typeLabel = (type: QuestionType): string => TYPE_LABELS[type]
