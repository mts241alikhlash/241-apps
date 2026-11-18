import type {
  ChoiceKey,
  QuestionType,
} from '../../../question/domain/value-objects/question-content.js'

const SECTIONS: Record<string, QuestionType> = {
  'BAGIAN PG': 'MULTIPLE_CHOICE',
  'BAGIAN PG KOMPLEKS': 'MULTIPLE_RESPONSE',
  'BAGIAN BENAR/SALAH': 'TRUE_FALSE',
  'BAGIAN ISIAN': 'SHORT_ANSWER',
  'BAGIAN URAIAN': 'ESSAY',
}

const LABEL_LINE = /^\s*(kunci|abaikan harakat|poin)\s*:\s*(.*?)\s*$/iu
const CHOICE_LINE = /^\s*([A-Ea-e])[.):]\s*([\s\S]*)$/u
const QUESTION_NUMBER = /^((?:<[^>]+>\s*)*)\d+[.)]((?:<\/[^>]+>)*)\s+/u
const CHOICE_MARKER = /^((?:<[^>]+>\s*)*)[A-Ea-e][.):]((?:<\/[^>]+>)*)\s*/u

export function sectionType(line: string): QuestionType | null {
  const name = line
    .replace(/\(\s*[^)]*\)\s*$/u, '')
    .replace(/\s*\/\s*/gu, '/')
    .replace(/\s+/gu, ' ')
    .trim()
    .toUpperCase()
  return SECTIONS[name] ?? null
}

export function readLabel(
  line: string,
): { label: 'kunci' | 'poin' | 'abaikan harakat'; value: string } | null {
  const match = LABEL_LINE.exec(line)
  if (!match) return null
  return {
    label: match[1].toLowerCase() as 'kunci' | 'poin' | 'abaikan harakat',
    value: match[2],
  }
}

export function choiceMarker(
  line: string,
): { key: ChoiceKey; rest: string } | null {
  const match = CHOICE_LINE.exec(line)
  if (!match) return null
  return { key: match[1].toUpperCase() as ChoiceKey, rest: match[2] }
}

export function stripQuestionNumber(html: string): string {
  return html.replace(QUESTION_NUMBER, '$1$2')
}

export function stripChoiceMarker(html: string): string {
  return html.replace(CHOICE_MARKER, '$1$2')
}
