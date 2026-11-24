// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { GradingItem } from '@/features/exam-grading/types'
import StudentRecapSheet from './StudentRecapSheet.vue'
import type { GradingSheetStudent } from './gradingSheet'

const sampleItem: GradingItem = {
  questionId: 'q1',
  number: 1,
  points: 5,
  bodyHtml: '<p>Jelaskan proses fotosintesis.</p>',
  answer: { text: 'Tumbuhan mengubah CO2 dan air menjadi glukosa.' },
  acceptedAnswers: null,
  choices: null,
  correctKeys: null,
  correctValue: null,
  gradedAt: null,
  manual: true,
  needsGrading: false,
  type: 'ESSAY',
  score: 4,
  guideHtml: '<p>Menyebut CO2, air, cahaya, dan glukosa.</p>',
  note: 'Cukup lengkap.',
}

const sampleStudent: GradingSheetStudent = {
  key: 's1',
  studentId: 's1',
  name: 'Ahmad Fauzan',
  participantNumber: '241-261-07-001',
  rawScore: 4,
  maxScore: 5,
  items: [sampleItem],
}

const mountSheet = (extra: Record<string, unknown> = {}) =>
  mount(StudentRecapSheet, {
    props: {
      subject: 'Ilmu Pengetahuan Alam',
      classroom: 'Kelas 7-A',
      date: 'Selasa, 24 November 2026',
      timeRange: '07:00 - 08:15',
      students: [sampleStudent],
      ...extra,
    },
    global: {
      stubs: {
        LetterheadKop: true,
        QuestionHtml: {
          props: ['html'],
          template: '<div class="q-html" v-html="html" />',
        },
      },
    },
  })

describe('StudentRecapSheet', () => {
  it('adds page breaks between stacked student recap sheets', () => {
    const stacked = mountSheet({ stacked: true })
    const standalone = mountSheet()

    expect(stacked.classes()).toContain('break-after-page')
    expect(stacked.classes()).toContain('last:break-after-auto')
    expect(stacked.classes()).not.toContain('print-stack')
    expect(standalone.classes()).toContain('print-stack')
  })

  it('renders participant metadata and total score', () => {
    const wrapper = mountSheet()

    expect(wrapper.text()).toContain('Rekap Soal dan Jawaban Siswa')
    expect(wrapper.text()).toContain('241-261-07-001')
    expect(wrapper.text()).toContain('Ahmad Fauzan')
    expect(wrapper.text()).toContain('4 / 5')
  })
})
