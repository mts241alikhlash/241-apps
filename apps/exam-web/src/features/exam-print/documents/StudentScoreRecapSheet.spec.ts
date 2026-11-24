// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { GradingItem } from '@/features/exam-grading/types'
import StudentScoreRecapSheet from './StudentScoreRecapSheet.vue'
import type { GradingSheetStudent } from './gradingSheet'
import {
  activeScoreColumns,
  scoreOfType,
  studentTotalScore,
} from './studentScoreRecap'

const makeItem = (
  questionId: string,
  number: number,
  type: GradingItem['type'],
  points: number,
  score: number | null,
): GradingItem => ({
  questionId,
  number,
  points,
  bodyHtml: `<p>Soal ${number}</p>`,
  answer: null,
  acceptedAnswers: null,
  choices: null,
  correctKeys: null,
  correctValue: null,
  gradedAt: null,
  manual: type === 'SHORT_ANSWER' || type === 'ESSAY',
  needsGrading: false,
  type,
  score,
  guideHtml: null,
  note: null,
})

const students = [
  {
    key: 'ses-1',
    studentId: 'stu-1',
    name: 'Ahmad Fauzan',
    participantNumber: '241-261-07-001',
    rawScore: 45,
    maxScore: 55,
    items: [
      makeItem('q1', 1, 'MULTIPLE_CHOICE', 10, 10),
      makeItem('q2', 2, 'MULTIPLE_CHOICE', 10, 10),
      makeItem('q3', 3, 'MULTIPLE_RESPONSE', 15, 15),
      makeItem('q4', 4, 'ESSAY', 20, 10),
    ],
  },
  {
    key: 'ses-2',
    studentId: 'stu-2',
    name: 'Budi Santoso',
    participantNumber: '241-261-07-002',
    rawScore: 25,
    maxScore: 55,
    items: [
      makeItem('q1', 1, 'MULTIPLE_CHOICE', 10, 10),
      makeItem('q2', 2, 'MULTIPLE_CHOICE', 10, 0),
      makeItem('q3', 3, 'MULTIPLE_RESPONSE', 15, 15),
      makeItem('q4', 4, 'ESSAY', 20, null),
    ],
  },
] as const satisfies readonly GradingSheetStudent[]

const mountSheet = (extra: Record<string, unknown> = {}) =>
  mount(StudentScoreRecapSheet, {
    props: {
      subject: 'Matematika',
      classroom: 'VII-A',
      date: 'Selasa, 24 November 2026',
      timeRange: '07:00 - 08:15',
      teacher: 'Ust. Abdullah, S.Pd',
      students: [...students],
      ...extra,
    },
    global: {
      stubs: { LetterheadKop: true },
    },
  })

describe('studentScoreRecap helpers', () => {
  it('returns only question types used in the exam with max points per type', () => {
    expect(activeScoreColumns([...students])).toEqual([
      { type: 'MULTIPLE_CHOICE', label: 'PG', maxPoints: 20 },
      { type: 'MULTIPLE_RESPONSE', label: 'PG Kompleks', maxPoints: 15 },
      { type: 'ESSAY', label: 'Uraian', maxPoints: 20 },
    ])
  })

  it('computes score by type and returns null when all items of a type are ungraded', () => {
    expect(scoreOfType(students[0], 'MULTIPLE_CHOICE')).toBe(20)
    expect(scoreOfType(students[0], 'ESSAY')).toBe(10)
    expect(scoreOfType(students[1], 'ESSAY')).toBeNull()
    expect(studentTotalScore(students[1])).toEqual({ raw: 25, max: 55 })
  })
})

describe('StudentScoreRecapSheet', () => {
  it('renders dynamic columns for used question types only, teacher metadata, and scores', () => {
    const wrapper = mountSheet({ students: [...students] })
    const headers = wrapper.findAll('thead th').map((th) => th.text())

    expect(wrapper.text()).toContain('Rekap Nilai Siswa')
    expect(wrapper.text()).toContain('Matematika')
    expect(wrapper.text()).toContain('VII-A')
    expect(wrapper.text()).toContain('Ust. Abdullah, S.Pd')
    expect(headers).toEqual([
      'No',
      'No. Peserta',
      'Nama Siswa',
      'PG (20)',
      'PG Kompleks (15)',
      'Uraian (20)',
      'Total Nilai',
    ])
    expect(headers.join(' ')).not.toContain('Benar/Salah')
    expect(headers.join(' ')).not.toContain('Isian')

    const rows = wrapper.findAll('.sheet-table tbody tr')
    const firstRow = rows[0]
    const secondRow = rows[1]
    expect(rows).toHaveLength(2)
    expect(firstRow?.text()).toContain('241-261-07-001')
    expect(firstRow?.text()).toContain('Ahmad Fauzan')
    expect(firstRow?.text()).toContain('45 / 55')
    expect(secondRow?.text()).toContain('Budi Santoso')
    expect(secondRow?.text()).toContain('-')
    expect(secondRow?.text()).toContain('25 / 55')
  })

  it('adds page breaks when stacked and falls back to blank signature when teacher missing', () => {
    const stacked = mountSheet({
      students: [...students],
      stacked: true,
      teacher: '',
    })
    expect(stacked.classes()).toContain('break-after-page')
    expect(stacked.text()).toContain('(.................................)')
  })
})
