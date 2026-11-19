import type { QuestionType } from '../../question/domain/value-objects/question-content.js'

export const STANDARD_COUNTS: Record<QuestionType, number> = {
  MULTIPLE_CHOICE: 20,
  MULTIPLE_RESPONSE: 10,
  TRUE_FALSE: 10,
  SHORT_ANSWER: 0,
  ESSAY: 5,
}

const LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'PG',
  MULTIPLE_RESPONSE: 'PG Kompleks',
  TRUE_FALSE: 'Benar/Salah',
  SHORT_ANSWER: 'Isian',
  ESSAY: 'Uraian',
}

export function countWarnings(counts: Record<QuestionType, number>): string[] {
  const warnings: string[] = []
  for (const type of Object.keys(STANDARD_COUNTS) as QuestionType[]) {
    const standard = STANDARD_COUNTS[type]
    if (standard === 0 || counts[type] === standard) continue
    warnings.push(`${LABELS[type]} ${counts[type]} dari ${standard}`)
  }
  return warnings
}
