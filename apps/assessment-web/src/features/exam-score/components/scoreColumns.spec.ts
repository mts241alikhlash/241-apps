import { describe, expect, it } from 'vitest'
import { buildScoreColumns } from './scoreColumns'
import type { ExamScore } from '../types'

const row: ExamScore = {
  id: 'e1',
  examSessionId: 'x1',
  studentId: 'st1',
  studentName: 'Ahmad Fauzi',
  studentNis: '2024001',
  subjectId: 'math',
  classroomId: 'c1',
  classroomName: 'VII A',
  semesterId: 'sem',
  examTitle: 'UTS Matematika',
  rawScore: 8,
  maxScore: 10.5,
  score: 76.19,
  gradedAt: '2026-11-03T02:00:00.000Z',
}

const cell = (id: string, value: ExamScore) =>
  (
    buildScoreColumns().find((column) => column.id === id)!.cell as (ctx: {
      row: { original: ExamScore }
    }) => string
  )({ row: { original: value } })

describe('buildScoreColumns', () => {
  it('shows the student with the nis, and the classroom or a dash', () => {
    expect(cell('student', row)).toBe('Ahmad Fauzi · 2024001')
    expect(cell('classroom', row)).toBe('VII A')
    expect(cell('classroom', { ...row, classroomName: null })).toBe('-')
  })

  it('shows the points and the percentage with at most two decimals', () => {
    expect(cell('raw', row)).toBe('8 / 10.5')
    expect(cell('score', row)).toBe('76,19')
    expect(cell('score', { ...row, score: 80 })).toBe('80')
  })
})
