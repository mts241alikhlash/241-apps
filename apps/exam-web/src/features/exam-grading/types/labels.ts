import type { GradingItem, PublicationState } from './grading'

export const itemTypeLabel = (type: GradingItem['type']): string =>
  type === 'ESSAY' ? 'Uraian' : 'Jawaban singkat'

export const publicationLabel = (state: PublicationState): string => {
  if (state === 'SENT') return 'Terkirim ke penilaian'
  if (state === 'PENDING') return 'Menunggu dikirim'
  return '-'
}

export function answerText(answer: GradingItem['answer']): string {
  return typeof answer?.text === 'string' ? answer.text : ''
}
