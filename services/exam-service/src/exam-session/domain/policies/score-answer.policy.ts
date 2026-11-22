import type {
  QuestionContent,
  QuestionType,
} from '../../../question/domain/value-objects/question-content.js'
import type { AnswerPayload } from './validate-answer-shape.policy.js'

const round = (value: number) => Math.round(value * 10000) / 10000

const HARAKAT = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/gu

function normalize(
  text: string,
  options: { ignoreCase: boolean; ignoreHarakat: boolean },
): string {
  let value = text.normalize('NFC').trim().replace(/\s+/gu, ' ')
  if (options.ignoreHarakat) value = value.replace(HARAKAT, '')
  if (options.ignoreCase) value = value.toLowerCase()
  return value
}

export function scoreAnswer(
  type: QuestionType,
  content: QuestionContent,
  answer: AnswerPayload | null,
  points: number,
): { score: number | null } {
  switch (type) {
    case 'MULTIPLE_CHOICE': {
      const correct = (content as { answer: { key: string } }).answer.key
      return {
        score: answer && 'key' in answer && answer.key === correct ? points : 0,
      }
    }
    case 'TRUE_FALSE': {
      const correct = (content as { answer: { value: boolean } }).answer.value
      return {
        score:
          answer && 'value' in answer && answer.value === correct ? points : 0,
      }
    }
    case 'MULTIPLE_RESPONSE': {
      if (!answer || !('keys' in answer)) return { score: 0 }
      const correct = new Set(
        (content as { answer: { keys: string[] } }).answer.keys,
      )
      const right = answer.keys.filter((key) => correct.has(key)).length
      const wrong = answer.keys.length - right
      return {
        score: round((points * Math.max(0, right - wrong)) / correct.size),
      }
    }
    case 'SHORT_ANSWER': {
      if (!answer || !('text' in answer)) return { score: null }
      const { accepted, ignoreCase, ignoreHarakat } = (
        content as {
          answer: {
            accepted: string[]
            ignoreCase: boolean
            ignoreHarakat: boolean
          }
        }
      ).answer
      const options = { ignoreCase, ignoreHarakat }
      const given = normalize(answer.text, options)
      const matched =
        given !== '' &&
        accepted.some((item) => normalize(item, options) === given)
      return { score: matched ? points : null }
    }
    case 'ESSAY':
      return { score: null }
  }
}
