// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ImportPreviewPanel from './ImportPreviewPanel.vue'
import type { ImportPreview } from '@/features/exam-bank/types'

const preview = (overrides: Partial<ImportPreview> = {}): ImportPreview => ({
  authorName: 'Siti Aminah',
  canSave: true,
  counts: {
    MULTIPLE_CHOICE: 3,
    MULTIPLE_RESPONSE: 1,
    TRUE_FALSE: 0,
    SHORT_ANSWER: 2,
    ESSAY: 1,
  },
  duplicateRows: [],
  errors: [],
  identity: {
    version: 2,
    teacherName: 'Siti Aminah',
    nik: '3201010101010001',
    subjectName: 'Matematika',
    gradeLevel: 7,
  },
  total: 7,
  totalPoints: 42,
  warnings: [],
  ...overrides,
})

const mountPanel = (
  overrides: Partial<ImportPreview> = {},
  confirmDuplicates = false,
) =>
  mount(ImportPreviewPanel, {
    props: { preview: preview(overrides), confirmDuplicates },
  })

describe('ImportPreviewPanel', () => {
  it('shows the identity read from the file', () => {
    const text = mountPanel().text()

    expect(text).toContain('Guru')
    expect(text).toContain('Siti Aminah')
    expect(text).toContain('NIK')
    expect(text).toContain('3201010101010001')
    expect(text).toContain('Mapel')
    expect(text).toContain('Matematika')
    expect(text).toContain('Tingkat')
    expect(text).toContain('7')
  })

  it('counts each question type with its label and shows the totals', () => {
    const text = mountPanel().text()

    expect(text).toContain('PG 3')
    expect(text).toContain('PG Kompleks 1')
    expect(text).toContain('Benar/Salah 0')
    expect(text).toContain('Isian 2')
    expect(text).toContain('Uraian 1')
    expect(text).toContain('Total soal 7')
    expect(text).toContain('Total poin 42')
  })

  it('lists every error with its row, and without a row when it is 0', () => {
    const wrapper = mountPanel({
      canSave: false,
      errors: [
        { row: 0, reason: 'Versi template tidak sesuai' },
        { row: 4, reason: 'Kunci di luar pilihan' },
      ],
    })

    expect(wrapper.text()).toContain('Versi template tidak sesuai')
    expect(wrapper.text()).not.toContain('Baris 0')
    expect(wrapper.text()).toContain('Baris 4: Kunci di luar pilihan')
  })

  it('lists every warning', () => {
    const wrapper = mountPanel({ warnings: ['Soal mirip di baris 6'] })

    expect(wrapper.text()).toContain('Soal mirip di baris 6')
  })

  it('shows no duplicate notice or checkbox without duplicates', () => {
    const wrapper = mountPanel()

    expect(wrapper.text()).not.toContain('Soal ganda')
    expect(wrapper.find('[role="checkbox"]').exists()).toBe(false)
  })

  it('asks for the duplicate confirmation and reports the tick', async () => {
    const wrapper = mountPanel({ canSave: false, duplicateRows: [3, 5] })

    expect(wrapper.text()).toContain('Soal ganda di baris 3, 5')
    expect(wrapper.text()).toContain('Simpan walau ada soal ganda')
    await wrapper.get('[role="checkbox"]').trigger('click')

    expect(wrapper.emitted('update:confirmDuplicates')).toEqual([[true]])
  })

  it('shows the checkbox as ticked when confirmDuplicates is set', () => {
    const wrapper = mountPanel({ canSave: false, duplicateRows: [3] }, true)

    expect(wrapper.get('[role="checkbox"]').attributes('aria-checked')).toBe(
      'true',
    )
  })
})
