// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GradingSheet from './GradingSheet.vue'
import type { GradingSheetStudent } from './gradingSheet'
import type { GradingItem } from '@/features/exam-grading/types'

const item = (number: number, overrides: Partial<GradingItem> = {}) =>
  ({
    questionId: `q${number}`,
    number,
    points: 4,
    bodyHtml: `<p>Soal ${number}</p>`,
    answer: { text: `Jawaban ${number}` },
    manual: true,
    type: 'ESSAY',
    ...overrides,
  }) as GradingItem

const student = (
  key: string,
  overrides: Partial<GradingSheetStudent> = {},
): GradingSheetStudent => ({
  key,
  studentId: key,
  name: `Nama ${key}`,
  participantNumber: '241-261-09-002',
  items: [item(1), item(2, { answer: null })],
  ...overrides,
})

const mountSheet = (
  students: GradingSheetStudent[],
  extra: Record<string, unknown> = {},
) =>
  mount(GradingSheet, {
    props: {
      subject: 'Matematika',
      classroom: 'Kelas 9-A',
      date: 'Senin, 23 November 2026',
      timeRange: '07:00 - 08:15',
      teacher: 'Afidah Dzuifa Husna, S. Pd.',
      students,
      ...extra,
    },
    global: {
      stubs: { LetterheadKop: true, QuestionHtml: { template: '<div />' } },
    },
  })

describe('GradingSheet', () => {
  it('prints one sheet per student with the participant number, not the NIS', () => {
    const wrapper = mountSheet([student('a'), student('b')])

    expect(wrapper.findAll('section.print-room')).toHaveLength(2)
    expect(wrapper.text()).toContain('Nomor Peserta')
    expect(wrapper.text()).toContain('241-261-09-002')
    expect(wrapper.text()).not.toContain('NIS')
  })

  it('shows a dash for an unanswered question and the answer for an answered one', () => {
    const wrapper = mountSheet([student('a')])

    const answers = wrapper.findAll('.item-jawab .col-body p:last-child')
    expect(answers.map((row) => row.text())).toEqual(['Jawaban 1', '-'])
  })

  it('totals the points once, in the last row, and names the examiner', () => {
    const wrapper = mountSheet([student('a')])

    expect(wrapper.text().match(/Jumlah nilai uraian/g)).toHaveLength(1)
    expect(wrapper.text()).toContain('/ 8')
    expect(wrapper.get('.sheet-signature-name').text()).toBe(
      'Afidah Dzuifa Husna, S. Pd.',
    )
    expect(wrapper.find('tfoot').exists()).toBe(false)
  })

  it('leaves a writing line for the examiner when no teacher is found', () => {
    const wrapper = mountSheet([student('a')], { teacher: '' })

    expect(wrapper.get('.sheet-signature-name').text()).toContain('....')
  })
})
