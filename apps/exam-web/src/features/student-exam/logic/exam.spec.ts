import { describe, expect, it } from 'vitest'
import {
  countAnswered,
  displayTitle,
  formatRemaining,
  groupExams,
  isAnswered,
} from './exam'
import type { MyExam, PaperQuestion } from '../types'

const exam = (overrides: Partial<MyExam> = {}): MyExam => ({
  id: 'e1',
  title: 'Latihan',
  subjectId: 's1',
  subjectName: null,
  type: 'QUIZ',
  startsAt: '2026-10-30T14:00:00.000Z',
  endsAt: '2026-10-31T03:00:00.000Z',
  durationMinutes: 60,
  minSubmitMinutes: 0,
  status: 'OPEN',
  sessionId: null,
  ...overrides,
})

const question = (overrides: Partial<PaperQuestion> = {}): PaperQuestion => ({
  id: 'q1',
  number: 1,
  type: 'MULTIPLE_CHOICE',
  bodyHtml: '<p>Soal</p>',
  points: 1,
  choices: [
    { key: 'A', html: '<p>A</p>' },
    { key: 'B', html: '<p>B</p>' },
  ],
  ...overrides,
})

describe('formatRemaining', () => {
  it('shows minutes and seconds under an hour', () => {
    expect(formatRemaining(65_000)).toBe('01:05')
  })

  it('shows hours when the remaining time exceeds one', () => {
    expect(formatRemaining(3_661_000)).toBe('01:01:01')
  })

  it('never goes below zero', () => {
    expect(formatRemaining(-5_000)).toBe('00:00')
  })
})

describe('groupExams', () => {
  it('splits open, upcoming and finished exams', () => {
    const groups = groupExams([
      exam({ id: 'a', status: 'OPEN' }),
      exam({ id: 'b', status: 'IN_PROGRESS' }),
      exam({ id: 'c', status: 'UPCOMING' }),
      exam({ id: 'd', status: 'FINISHED' }),
    ])
    expect(groups.BISA_DIKERJAKAN.map((row) => row.id)).toEqual(['a', 'b'])
    expect(groups.AKAN_DATANG.map((row) => row.id)).toEqual(['c'])
    expect(groups.SELESAI.map((row) => row.id)).toEqual(['d'])
  })
})

describe('displayTitle', () => {
  it('prefixes the exam type when the subject is known', () => {
    expect(displayTitle(exam({ subjectName: 'Matematika' }))).toBe(
      'QUIZ - Matematika',
    )
  })

  it('falls back to the package title without a subject', () => {
    expect(displayTitle(exam())).toBe('Latihan')
  })
})

describe('isAnswered', () => {
  it('requires a key for a single choice question', () => {
    expect(isAnswered(question(), { key: 'A' })).toBe(true)
    expect(isAnswered(question(), undefined)).toBe(false)
  })

  it('requires at least one key for a multiple response question', () => {
    const multi = question({ type: 'MULTIPLE_RESPONSE' })
    expect(isAnswered(multi, { keys: ['A', 'C'] })).toBe(true)
    expect(isAnswered(multi, { keys: [] })).toBe(false)
  })

  it('treats a blank essay as unanswered', () => {
    const essay = question({ type: 'ESSAY', choices: null })
    expect(isAnswered(essay, { text: '   ' })).toBe(false)
    expect(isAnswered(essay, { text: 'Jawaban' })).toBe(true)
  })

  it('ignores an answer shaped for another question type', () => {
    expect(isAnswered(question(), { text: 'salah bentuk' })).toBe(false)
  })
})

describe('countAnswered', () => {
  it('counts only questions with a usable answer', () => {
    const questions = [
      question({ id: 'q1' }),
      question({ id: 'q2' }),
      question({ id: 'q3' }),
    ]
    const answers = new Map([
      ['q1', { key: 'A' as const }],
      ['q2', { key: '' as const }],
    ])
    expect(countAnswered(questions, answers)).toBe(1)
  })
})
