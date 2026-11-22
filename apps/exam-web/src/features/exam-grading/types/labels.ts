import type { GradingItem, PublicationState } from './grading'

const ITEM_TYPE_LABELS: Record<GradingItem['type'], string> = {
  MULTIPLE_CHOICE: 'Pilihan ganda',
  MULTIPLE_RESPONSE: 'Pilihan ganda kompleks',
  TRUE_FALSE: 'Benar atau salah',
  SHORT_ANSWER: 'Jawaban singkat',
  ESSAY: 'Uraian',
}

export const itemTypeLabel = (type: GradingItem['type']): string =>
  ITEM_TYPE_LABELS[type]

export function chosenKeys(answer: GradingItem['answer']): string[] {
  if (typeof answer?.key === 'string') return [answer.key]
  if (Array.isArray(answer?.keys)) return answer.keys.map(String)
  return []
}

export const booleanLabel = (value: unknown): string =>
  value === true ? 'Benar' : value === false ? 'Salah' : '-'

export const publicationLabel = (state: PublicationState): string => {
  if (state === 'SENT') return 'Terkirim ke penilaian'
  if (state === 'PENDING') return 'Menunggu dikirim'
  return '-'
}

export function answerText(answer: GradingItem['answer']): string {
  return typeof answer?.text === 'string' ? answer.text : ''
}
