import type {
  MultipleChoiceContent,
  MultipleResponseContent,
  QuestionContent,
  QuestionType,
  ShortAnswerContent,
} from '../types'

export function hasContent(html: string): boolean {
  if (/<img\b|data-latex=/.test(html)) return true
  return html.replace(/<[^>]*>|&nbsp;|\s/g, '') !== ''
}

const twoChoices = () => [
  { key: 'A' as const, html: '' },
  { key: 'B' as const, html: '' },
]

export function emptyContent(type: QuestionType): QuestionContent {
  switch (type) {
    case 'MULTIPLE_CHOICE':
      return { choices: twoChoices(), answer: { key: 'A' } }
    case 'MULTIPLE_RESPONSE':
      return { choices: twoChoices(), answer: { keys: [] } }
    case 'TRUE_FALSE':
      return { answer: { value: true } }
    case 'SHORT_ANSWER':
      return {
        answer: { accepted: [''], ignoreCase: true, ignoreHarakat: false },
      }
    case 'ESSAY':
      return { guideHtml: null }
  }
}

export function cleanContent(
  type: QuestionType,
  content: QuestionContent,
): QuestionContent {
  if (type !== 'SHORT_ANSWER') return content
  const short = content as ShortAnswerContent
  return {
    answer: {
      ...short.answer,
      accepted: short.answer.accepted
        .map((answer) => answer.trim())
        .filter((answer) => answer !== ''),
    },
  }
}

export const MIN_POINTS = 0.25
export const MAX_POINTS = 100

export function validateDraft(
  type: QuestionType,
  bodyHtml: string,
  content: QuestionContent,
  points: number,
): string | null {
  if (!hasContent(bodyHtml)) return 'Isi soal wajib diisi'

  if (type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_RESPONSE') {
    const choiceContent = content as
      MultipleChoiceContent | MultipleResponseContent
    if (choiceContent.choices.some((choice) => !hasContent(choice.html))) {
      return 'Isi semua pilihan jawaban'
    }
    if (
      type === 'MULTIPLE_RESPONSE' &&
      (content as MultipleResponseContent).answer.keys.length === 0
    ) {
      return 'Pilih minimal satu kunci jawaban'
    }
  }

  if (type === 'SHORT_ANSWER') {
    const accepted = (content as ShortAnswerContent).answer.accepted
    if (!accepted.some((answer) => answer.trim() !== '')) {
      return 'Isi minimal satu jawaban benar'
    }
  }

  if (!Number.isFinite(points) || points < MIN_POINTS || points > MAX_POINTS) {
    return 'Poin harus antara 0,25 dan 100'
  }
  return null
}
