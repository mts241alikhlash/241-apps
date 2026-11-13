import type {
  ChoiceKey,
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

const initialChoices = () => [
  { key: 'A' as const, html: '' },
  { key: 'B' as const, html: '' },
  { key: 'C' as const, html: '' },
  { key: 'D' as const, html: '' },
]

export function emptyContent(type: QuestionType): QuestionContent {
  switch (type) {
    case 'MULTIPLE_CHOICE':
      return { choices: initialChoices(), answer: { key: 'A' } }
    case 'MULTIPLE_RESPONSE':
      return { choices: initialChoices(), answer: { keys: [] } }
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

type ChoiceContent = MultipleChoiceContent | MultipleResponseContent

function withoutTrailingEmpty<T extends { html: string }>(choices: T[]): T[] {
  let end = choices.length
  while (end > 0 && !hasContent(choices[end - 1].html)) end -= 1
  return choices.slice(0, end)
}

function keysOf(content: ChoiceContent): ChoiceKey[] {
  return 'keys' in content.answer ? content.answer.keys : [content.answer.key]
}

export function cleanContent(
  type: QuestionType,
  content: QuestionContent,
): QuestionContent {
  if (type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_RESPONSE') {
    const choiceContent = content as ChoiceContent
    return {
      ...choiceContent,
      choices: withoutTrailingEmpty(choiceContent.choices),
    }
  }
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
    const choiceContent = content as ChoiceContent
    const filled = withoutTrailingEmpty(choiceContent.choices)
    if (filled.some((choice) => !hasContent(choice.html))) {
      return 'Isi semua pilihan jawaban'
    }
    if (filled.length < 2) return 'Isi minimal dua pilihan jawaban'
    const filledKeys = new Set(filled.map((choice) => choice.key))
    if (keysOf(choiceContent).some((key) => !filledKeys.has(key))) {
      return 'Kunci jawaban harus pada pilihan yang terisi'
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
