import type {
  Choice,
  ChoiceKey,
  MultipleChoiceContent,
  MultipleResponseContent,
} from '../types'
import { CHOICE_KEYS } from '../types'

export const MIN_CHOICES = 2
export const MAX_CHOICES = CHOICE_KEYS.length

type ChoiceContent = MultipleChoiceContent | MultipleResponseContent

export function isMultiple(
  content: ChoiceContent,
): content is MultipleResponseContent {
  return 'keys' in content.answer
}

export function addChoice<T extends ChoiceContent>(content: T): T {
  if (content.choices.length >= MAX_CHOICES) return content
  const key = CHOICE_KEYS[content.choices.length]
  return { ...content, choices: [...content.choices, { key, html: '' }] }
}

export function setSingleKey(
  content: MultipleChoiceContent,
  key: ChoiceKey,
): MultipleChoiceContent {
  return { ...content, answer: { key } }
}

export function toggleKey(
  content: MultipleResponseContent,
  key: ChoiceKey,
): MultipleResponseContent {
  const keys = content.answer.keys.includes(key)
    ? content.answer.keys.filter((candidate) => candidate !== key)
    : [...content.answer.keys, key]
  return {
    ...content,
    answer: {
      keys: CHOICE_KEYS.filter((candidate) => keys.includes(candidate)),
    },
  }
}

export function removeChoice<T extends ChoiceContent>(
  content: T,
  key: ChoiceKey,
): T {
  if (content.choices.length <= MIN_CHOICES) return content

  const remaining = content.choices.filter((choice) => choice.key !== key)
  const letterOf = new Map<ChoiceKey, ChoiceKey>(
    remaining.map((choice, index) => [choice.key, CHOICE_KEYS[index]]),
  )
  const choices: Choice[] = remaining.map((choice) => ({
    key: letterOf.get(choice.key)!,
    html: choice.html,
  }))

  if (isMultiple(content)) {
    const keys = content.answer.keys
      .map((answerKey) => letterOf.get(answerKey))
      .filter((answerKey): answerKey is ChoiceKey => answerKey !== undefined)
    return { ...content, choices, answer: { keys } }
  }
  const mapped = letterOf.get(content.answer.key)
  return { ...content, choices, answer: { key: mapped ?? 'A' } }
}
