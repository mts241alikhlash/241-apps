import { describe, expect, it } from 'vitest'
import type { ParsedQuestion } from '../parsed-question.js'
import { TEMPLATE_VERSION, type SheetIdentity } from '../import-sheet.js'
import {
  duplicateRows,
  parseGradeLevel,
  validateIdentity,
} from './validate-sheet.policy.js'

const identity: SheetIdentity = {
  version: TEMPLATE_VERSION,
  teacherName: 'Siti',
  nik: '1234567890',
  subjectName: 'Matematika',
  gradeLevel: 8,
}

const target = { subjectName: 'Matematika', gradeLevel: 8 }

describe('parseGradeLevel', () => {
  it('reads arabic and roman numerals, trimmed', () => {
    expect(parseGradeLevel('8')).toBe(8)
    expect(parseGradeLevel('VIII')).toBe(8)
    expect(parseGradeLevel(' 8 ')).toBe(8)
  })

  it('refuses anything else', () => {
    expect(parseGradeLevel('X')).toBeNull()
    expect(parseGradeLevel('')).toBeNull()
  })
})

describe('validateIdentity', () => {
  it('refuses a version 1 template', () => {
    expect(validateIdentity({ ...identity, version: 1 }, target)).toEqual([
      'Template lama. Unduh template baru.',
    ])
  })

  it('matches subject trimmed and case-insensitively', () => {
    expect(
      validateIdentity({ ...identity, subjectName: 'matematika ' }, target),
    ).toEqual([])
  })

  it('reports a subject or grade mismatch as one message', () => {
    expect(
      validateIdentity(identity, { subjectName: 'IPA', gradeLevel: 7 }),
    ).toEqual(['File untuk Matematika tingkat 8, paket tujuan IPA tingkat 7'])
  })

  it('requires the teacher NIK', () => {
    expect(validateIdentity({ ...identity, nik: '' }, target)).toEqual([
      'NIK guru wajib diisi',
    ])
  })
})

describe('duplicateRows', () => {
  it('matches question text ignoring tags, spacing and case', () => {
    const questions: ParsedQuestion[] = [
      {
        row: 4,
        type: 'SHORT_ANSWER',
        bodyHtml: '<p dir="auto">berapa hasil 2+3?</p>',
        content: {},
        points: 1,
      },
    ]
    expect(duplicateRows(['<p>Berapa  hasil 2+3?</p>'], questions)).toEqual([4])
  })
})
