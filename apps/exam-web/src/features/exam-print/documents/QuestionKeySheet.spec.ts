// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ExamPackagePrintItem } from '@/features/exam-package/types'
import QuestionKeySheet from './QuestionKeySheet.vue'

const mountSheet = (
  items: ExamPackagePrintItem[],
  extra: Record<string, unknown> = {},
) =>
  mount(QuestionKeySheet, {
    props: {
      subject: 'Matematika',
      grade: 'Kelas 7',
      packageTitle: 'ASAS Matematika 7',
      date: 'Senin, 23 November 2026',
      timeRange: '07:00 - 08:30',
      items,
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

describe('QuestionKeySheet', () => {
  it('renders header metadata without any signature block', () => {
    const wrapper = mountSheet([
      {
        questionId: 'q1',
        questionVersion: 1,
        position: 1,
        type: 'TRUE_FALSE',
        bodyHtml: '<p>2 + 2 = 4</p>',
        content: { answer: { value: true } },
        points: 2,
        resolution: 'NORMAL',
      },
    ])

    const text = wrapper.text()
    expect(text).toContain('Daftar Soal dan Kunci Jawaban')
    expect(text).toContain('Matematika')
    expect(text).toContain('Kelas 7')
    expect(text).toContain('ASAS Matematika 7')
    expect(text).toContain('Senin, 23 November 2026')
    expect(text).toContain('07:00 - 08:30')
    expect(text).toContain('1 soal · Total nilai 2')
    expect(wrapper.find('.sheet-signatures').exists()).toBe(false)
    expect(text).not.toContain('Kepala Madrasah')
  })

  it('uses two-row GradingSheet layout with Soal then Pilihan/Kunci/Pedoman and ticks choice keys', () => {
    const wrapper = mountSheet([
      {
        questionId: 'q1',
        questionVersion: 1,
        position: 1,
        type: 'MULTIPLE_CHOICE',
        bodyHtml: '<p>Ibu kota RI?</p>',
        content: {
          choices: [
            { key: 'A', html: '<p>Bandung</p>' },
            { key: 'B', html: '<p>Jakarta</p>' },
          ],
          answer: { key: 'B' },
        },
        points: 2,
        resolution: 'NORMAL',
      },
      {
        questionId: 'q2',
        questionVersion: 1,
        position: 2,
        type: 'MULTIPLE_RESPONSE',
        bodyHtml: '<p>Bilangan prima</p>',
        content: {
          choices: [
            { key: 'A', html: '<p>2</p>' },
            { key: 'B', html: '<p>3</p>' },
            { key: 'C', html: '<p>4</p>' },
          ],
          answer: { keys: ['A', 'B'] },
        },
        points: 3,
        resolution: 'NORMAL',
      },
      {
        questionId: 'q3',
        questionVersion: 1,
        position: 3,
        type: 'TRUE_FALSE',
        bodyHtml: '<p>Matahari terbit dari barat</p>',
        content: { answer: { value: false } },
        points: 1,
        resolution: 'NORMAL',
      },
      {
        questionId: 'q4',
        questionVersion: 1,
        position: 4,
        type: 'SHORT_ANSWER',
        bodyHtml: '<p>Arti al-ikhlas</p>',
        content: {
          answer: {
            accepted: ['murni', 'ikhlas'],
            ignoreCase: true,
            ignoreHarakat: true,
          },
        },
        points: 2,
        resolution: 'NORMAL',
      },
      {
        questionId: 'q5',
        questionVersion: 1,
        position: 5,
        type: 'ESSAY',
        bodyHtml: '<p>Jelaskan rukun wudhu</p>',
        content: { guideHtml: '<p>Sebutkan 6 rukun</p>' },
        points: 5,
        resolution: 'NORMAL',
      },
      {
        questionId: 'q6',
        questionVersion: 1,
        position: 6,
        type: 'ESSAY',
        bodyHtml: '<p>Uraian tanpa pedoman</p>',
        content: { guideHtml: null },
        points: 4,
        resolution: 'NORMAL',
      },
    ])

    const soalRows = wrapper.findAll('tbody tr.item-soal')
    const jawabRows = wrapper.findAll('tbody tr.item-jawab')
    expect(soalRows).toHaveLength(6)
    expect(jawabRows).toHaveLength(6)

    expect(soalRows[0].text()).toContain('Soal')
    expect(jawabRows[0].text()).toContain('Pilihan')
    expect(jawabRows[0].findAll('.choice-item.is-correct')).toHaveLength(1)
    expect(jawabRows[0].find('.choice-item.is-correct').text()).toContain('B.')
    expect(jawabRows[0].find('.choice-item.is-correct').text()).toContain('✓')
    expect(jawabRows[0].text()).not.toContain('Kunci:')

    expect(jawabRows[1].findAll('.choice-item.is-correct')).toHaveLength(2)
    expect(jawabRows[1].findAll('.choice-mark')).toHaveLength(2)

    expect(jawabRows[2].text()).toContain('Pilihan')
    expect(jawabRows[2].find('.tf-option.is-correct').text()).toContain('Salah')
    expect(jawabRows[2].find('.tf-option.is-correct').text()).toContain('✓')

    expect(jawabRows[3].text()).toContain('Kunci Jawaban')
    expect(jawabRows[3].text()).toContain('murni / ikhlas (abaikan harakat)')

    expect(jawabRows[4].text()).toContain('Pedoman Penilaian')
    expect(jawabRows[4].text()).toContain('Sebutkan 6 rukun')
    expect(jawabRows[5].text()).toContain('-')
  })

  it('renders BONUS_ALL without ticking choices and marks KEY_OVERRIDE', () => {
    const wrapper = mountSheet([
      {
        questionId: 'q1',
        questionVersion: 1,
        position: 1,
        type: 'MULTIPLE_CHOICE',
        bodyHtml: '<p>Soal bonus</p>',
        content: {
          choices: [
            { key: 'A', html: '<p>A</p>' },
            { key: 'B', html: '<p>B</p>' },
          ],
          answer: { key: 'A' },
        },
        points: 2,
        resolution: 'BONUS_ALL',
      },
      {
        questionId: 'q2',
        questionVersion: 1,
        position: 2,
        type: 'MULTIPLE_CHOICE',
        bodyHtml: '<p>Soal ralat</p>',
        content: {
          choices: [
            { key: 'A', html: '<p>A</p>' },
            { key: 'B', html: '<p>B</p>' },
          ],
          answer: { key: 'B' },
        },
        points: 2,
        resolution: 'KEY_OVERRIDE',
      },
    ])

    const jawabRows = wrapper.findAll('tbody tr.item-jawab')
    expect(jawabRows[0].findAll('.choice-item.is-correct')).toHaveLength(0)
    expect(jawabRows[0].text()).toContain('Bonus (semua jawaban benar)')
    expect(jawabRows[1].find('.choice-item.is-correct').text()).toContain('B.')
    expect(jawabRows[1].find('.choice-item.is-correct').text()).toContain('✓')
    expect(jawabRows[1].text()).toContain('Penyesuaian kunci')
  })

  it('shows empty state when package has no questions', () => {
    const wrapper = mountSheet([])
    expect(wrapper.text()).toContain('Belum ada soal pada paket ini.')
  })

  it('adds page breaks between stacked question key sheets', () => {
    const stacked = mountSheet([], { stacked: true })
    const standalone = mountSheet([])

    expect(stacked.classes()).toContain('break-after-page')
    expect(stacked.classes()).toContain('last:break-after-auto')
    expect(stacked.classes()).not.toContain('print-stack')
    expect(standalone.classes()).toContain('print-stack')
  })
})
