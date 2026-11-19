import type { QuestionType } from '../../../question/domain/value-objects/question-content.js'
import { buildDocxPackage, paragraph, table } from './docx-package.js'

const ORDER: QuestionType[] = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_RESPONSE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'ESSAY',
]

const SECTION_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'BAGIAN PG',
  MULTIPLE_RESPONSE: 'BAGIAN PG KOMPLEKS',
  TRUE_FALSE: 'BAGIAN BENAR/SALAH',
  SHORT_ANSWER: 'BAGIAN ISIAN',
  ESSAY: 'BAGIAN URAIAN',
}

const CHOICE_LETTERS: Record<QuestionType, string[]> = {
  MULTIPLE_CHOICE: ['A', 'B', 'C', 'D'],
  MULTIPLE_RESPONSE: ['A', 'B', 'C', 'D', 'E'],
  TRUE_FALSE: [],
  SHORT_ANSWER: [],
  ESSAY: [],
}

function questionSlots(type: QuestionType, number: number): string[] {
  const choices = CHOICE_LETTERS[type].map((letter) => `${letter}.`)
  return [
    paragraph(`${number}. <tulis soal di sini>`),
    ...choices.map(paragraph),
    paragraph('Kunci:'),
    paragraph('Poin:'),
  ]
}

function documentBody(counts: Record<QuestionType, number>): string {
  const identity = table([
    ['Versi Template', 2],
    ['Nama Guru', null],
    ['NIK', null],
    ['Mapel', null],
    ['Tingkat', null],
  ])
  const sections: string[] = []
  let number = 0
  for (const type of ORDER) {
    const count = counts[type]
    if (count === 0) continue
    sections.push(paragraph(SECTION_LABELS[type]))
    for (let index = 0; index < count; index += 1) {
      number += 1
      sections.push(...questionSlots(type, number))
    }
  }
  return [
    paragraph(
      'Isi identitas di atas. Tulis soal di tiap bagian, lalu Kunci dan Poin.',
    ),
    identity,
    ...sections,
  ].join('')
}

export async function buildVerticalDocxTemplate(
  counts: Record<QuestionType, number>,
): Promise<Buffer> {
  return buildDocxPackage(documentBody(counts))
}
