import type {
  Choice,
  QuestionType,
} from '../../../question/domain/value-objects/question-content.js'
import type { ParseResult } from '../../domain/parsed-question.js'
import {
  buildImportContent,
  ImportRowError,
  parsePoints,
} from '../../domain/policies/import-content.policy.js'
import { inlineToHtml } from '../../domain/policies/inline-latex.policy.js'
import { isBlank, plain } from './html-text.js'
import {
  choiceMarker,
  readLabel,
  sectionType,
  stripChoiceMarker,
  stripQuestionNumber,
} from '../../domain/policies/vertical-lines.policy.js'

interface Block {
  kind: 'p' | 'item'
  html: string
}

interface Draft {
  order: number
  number: number
  type: QuestionType
  body: string[]
  choices: string[]
  typed: boolean
  automatic: boolean
  answering: boolean
  key: string
  ignoreHarakat: boolean
  error: string | null
}

const TABLE = /<table\b[\s\S]*?<\/table>/gu
const BLOCK_TAG = /<(\/?)(p|h[1-6]|ol|ul|li)\b[^>]*>/giu
const UNKNOWN_SECTION = /^bagian\b/iu
const NUMBERED = /^\d+[.)]\s/u
const BREAK = /<br\s*\/?>/giu
const SPACES = /&nbsp;|\u00a0/gu
const CHOICE_KEYS = ['A', 'B', 'C', 'D', 'E'] as const
const SECTION_NAMES: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'PG',
  MULTIPLE_RESPONSE: 'PG Kompleks',
  TRUE_FALSE: 'Benar/Salah',
  SHORT_ANSWER: 'Isian',
  ESSAY: 'Uraian',
}

function readBlocks(html: string): Block[] {
  const source = html.replace(TABLE, '').replace(SPACES, ' ')
  const blocks: Block[] = []
  let kind: Block['kind'] | null = null
  let buffer = ''

  const flush = (): void => {
    const current = kind
    if (current !== null) {
      let first = true
      for (const line of buffer.split(BREAK)) {
        if (isBlank(line)) continue
        blocks.push({ kind: first ? current : 'p', html: line.trim() })
        first = false
      }
    }
    kind = null
    buffer = ''
  }
  const append = (text: string): void => {
    if (kind === null && !isBlank(text)) kind = 'p'
    if (kind !== null) buffer += text
  }

  let last = 0
  for (const match of source.matchAll(BLOCK_TAG)) {
    append(source.slice(last, match.index))
    last = match.index + match[0].length
    flush()
    const name = (match[2] ?? '').toLowerCase()
    if (match[1] === '') {
      if (name === 'li') kind = 'item'
      else if (name !== 'ol' && name !== 'ul') kind = 'p'
    }
  }
  append(source.slice(last))
  flush()
  return blocks
}

export function hasVerticalSections(html: string): boolean {
  return readBlocks(html).some(
    (block) => block.kind === 'p' && sectionType(plain(block.html)) !== null,
  )
}

function checkTypedOrder(choices: string[]): void {
  const blank = (choice: string): boolean => isBlank(stripChoiceMarker(choice))
  let end = choices.length
  while (end > 0 && blank(choices[end - 1] ?? '')) end -= 1
  for (const [index, choice] of choices.slice(0, end).entries()) {
    const expected = CHOICE_KEYS[index]
    if (expected === undefined) return
    if (blank(choice) || choiceMarker(plain(choice))?.key !== expected) {
      throw new ImportRowError(
        `Pilihan harus berurutan A, B, C dan seterusnya, pilihan ${expected} kosong atau tidak berurutan`,
      )
    }
  }
}

function hasChoices(type: QuestionType): boolean {
  return type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_RESPONSE'
}

export function readVerticalQuestions(html: string): ParseResult {
  const result: ParseResult = { questions: [], errors: [] }
  let type: QuestionType | null = null
  let number = 0
  let order = 0
  let draft = null as Draft | null
  let orphaned = false

  const finish = (current: Draft, points: string | null): void => {
    const prefix = `Bagian ${SECTION_NAMES[current.type]}, soal ${current.number}: `
    try {
      if (current.error !== null) throw new ImportRowError(current.error)
      if (points === null || points === '') {
        throw new ImportRowError('soal tidak diakhiri baris Poin')
      }
      if (current.typed && current.automatic) {
        throw new ImportRowError(
          'pilihan tidak boleh mencampur ketikan dan penomoran otomatis',
        )
      }
      const bodyHtml = inlineToHtml(
        stripQuestionNumber(current.body.join('<br>')),
      )
      if (isBlank(bodyHtml)) throw new ImportRowError('soal kosong')
      if (current.typed) checkTypedOrder(current.choices)
      const filled = current.choices.filter(
        (choice) => !isBlank(stripChoiceMarker(choice)),
      )
      if (
        hasChoices(current.type) &&
        (filled.length < 2 || filled.length > CHOICE_KEYS.length)
      ) {
        throw new ImportRowError('Pilihan jawaban harus 2 sampai 5')
      }
      if (current.type !== 'ESSAY' && current.key.trim() === '') {
        throw new ImportRowError('Kunci jawaban harus diisi')
      }
      const choices: Choice[] = filled.map((choice, index) => ({
        key: CHOICE_KEYS[index] ?? 'E',
        html: inlineToHtml(stripChoiceMarker(choice)),
      }))
      let key = current.key
      if (hasChoices(current.type)) {
        const available = new Set<string>(choices.map((choice) => choice.key))
        const letters = key
          .split(/[\s,;]+/u)
          .filter((part) => part !== '')
          .map((part) => part.replace(/[.)]+$/u, '').toUpperCase())
        for (const letter of letters) {
          if (!available.has(letter)) {
            throw new ImportRowError(
              `Kunci ${letter} tidak ada di antara pilihan soal ini`,
            )
          }
        }
        key = letters.join(', ')
      }
      result.questions.push({
        row: current.order,
        type: current.type,
        bodyHtml,
        content: buildImportContent(current.type, {
          choices,
          key,
          ignoreHarakat: current.ignoreHarakat,
        }),
        points: parsePoints(points),
      })
    } catch (error) {
      if (!(error instanceof ImportRowError)) throw error
      result.errors.push({
        row: current.order,
        reason: `${prefix}${error.message}`,
      })
    }
  }

  const open = (current: QuestionType, body: string[]): Draft => {
    order += 1
    number += 1
    return {
      order,
      number,
      type: current,
      body,
      choices: [],
      typed: false,
      automatic: false,
      answering: false,
      key: '',
      ignoreHarakat: false,
      error: null,
    }
  }

  const close = (): void => {
    if (draft !== null) finish(draft, null)
    draft = null
  }

  for (const block of readBlocks(html)) {
    const text = plain(block.html)
    const section = block.kind === 'p' ? sectionType(text) : null
    if (section !== null) {
      close()
      type = section
      number = 0
      continue
    }
    if (block.kind === 'p' && UNKNOWN_SECTION.test(text)) {
      close()
      type = null
      orphaned = false
      result.errors.push({
        row: order + 1,
        reason: `Bagian tidak dikenal: ${text}`,
      })
      continue
    }
    const label = block.kind === 'p' ? readLabel(text) : null

    if (type === null) {
      if (label !== null && !orphaned) {
        orphaned = true
        result.errors.push({
          row: 0,
          reason: 'Bagian tidak ditemukan sebelum soal',
        })
      }
      continue
    }

    if (label !== null) {
      const current = draft ?? open(type, [])
      draft = current
      if (label.label === 'poin') {
        finish(current, label.value)
        draft = null
        continue
      }
      current.answering = true
      if (label.label === 'kunci') current.key = label.value
      else current.ignoreHarakat = label.value.toLowerCase() === 'ya'
      continue
    }

    if (draft === null) {
      draft = open(type, [block.html])
      continue
    }

    const finished = draft
    const restarts =
      block.kind === 'item'
        ? !hasChoices(type) || finished.answering
        : finished.answering || NUMBERED.test(text)
    if (restarts) {
      finish(finished, null)
      draft = open(type, [block.html])
      continue
    }

    const current = finished
    const marker =
      block.kind === 'p' && hasChoices(type) ? choiceMarker(text) : null
    const choice =
      hasChoices(type) && (block.kind === 'item' || marker !== null)
    if (choice && !current.answering) {
      current.choices.push(block.html)
      if (block.kind === 'item') current.automatic = true
      else current.typed = true
    } else if (!current.answering && current.choices.length === 0) {
      current.body.push(block.html)
    } else {
      current.error ??= 'teks tidak dikenali setelah pilihan'
    }
  }
  close()
  return result
}
