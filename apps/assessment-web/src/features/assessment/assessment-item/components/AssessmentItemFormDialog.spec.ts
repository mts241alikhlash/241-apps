// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeachingAssignment } from '@/features/lookup/teaching-assignment/types'
import { assessmentItemApi } from '../api/assessmentItemApi'
import type { AssessmentItem } from '../types'
import AssessmentItemFormDialog from './AssessmentItemFormDialog.vue'

vi.mock('../api/assessmentItemApi', () => ({
  assessmentItemApi: {
    getAssessmentItems: vi.fn(),
    createAssessmentItem: vi.fn(),
    updateAssessmentItem: vi.fn(),
    deleteAssessmentItem: vi.fn(),
  },
}))

const RENAME_WARNING =
  'Nama ini dipakai sebagai nama TP/LM di RDM. Kalau sudah dikirim ke RDM, mengganti nama akan membuat TP/LM baru di sana. Nama untuk RDM maksimal 50 karakter.'

const assignments: TeachingAssignment[] = [
  {
    id: 'ta-1',
    employeeId: 'emp-1',
    classroomId: 'cls-1',
    subjectId: 'sub-1',
    semesterId: 'sem-1',
  },
]

const classrooms = [
  {
    id: 'cls-1',
    code: '7A',
    name: 'Kelas 7A',
    gradeId: 'grade-7',
    grade: { level: 7, name: 'Kelas 7' },
  },
]

const subjects = [{ id: 'sub-1', name: 'Matematika' }]

function makeItem(overrides: Partial<AssessmentItem> = {}): AssessmentItem {
  return {
    id: 'item-1',
    teachingAssignmentId: 'ta-1',
    name: 'UH 1',
    type: 'DAILY',
    weight: 1,
    maxScore: 100,
    material: null,
    kktp: null,
    gradedCount: 0,
    createdAt: '2026-11-25T00:00:00.000Z',
    updatedAt: '2026-11-25T00:00:00.000Z',
    ...overrides,
  }
}

function renderDialog(editData: AssessmentItem | null = null) {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(AssessmentItemFormDialog, {
    props: {
      open: true,
      assignments,
      classrooms,
      subjects,
      initialClassroomId: 'cls-1',
      initialSubjectId: 'sub-1',
      editData,
    },
    global: {
      plugins: [pinia],
    },
    attachTo: document.body,
  })
}

function findFieldItem(labelIncludes: string): HTMLElement {
  const items = Array.from(
    document.body.querySelectorAll<HTMLElement>('[data-slot="form-item"]'),
  )
  const match = items.find((item) =>
    item
      .querySelector('[data-slot="ff-label"]')
      ?.textContent?.includes(labelIncludes),
  )
  expect(match, `field "${labelIncludes}"`).toBeDefined()
  return match!
}

async function setControlValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  await flushPromises()
}

async function submitForm() {
  const form = document.body.querySelector<HTMLFormElement>(
    '#assessment-item-form',
  )
  expect(form).not.toBeNull()
  form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await new Promise((resolve) => setTimeout(resolve, 50))
  await flushPromises()
}

describe('AssessmentItemFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(assessmentItemApi.createAssessmentItem).mockResolvedValue({
      data: { data: makeItem() },
    } as never)
    vi.mocked(assessmentItemApi.updateAssessmentItem).mockResolvedValue({
      data: { data: makeItem() },
    } as never)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders Ringkasan TP/Lingkup Materi textarea and Nilai Batas Ketercapaian (KKTP) input', async () => {
    const wrapper = renderDialog()
    await flushPromises()

    const materialField = findFieldItem('Ringkasan TP/Lingkup Materi')
    expect(materialField.querySelector('textarea')).not.toBeNull()

    const kktpField = findFieldItem('Nilai Batas Ketercapaian (KKTP)')
    const kktpInput = kktpField.querySelector('input')
    expect(kktpInput).not.toBeNull()
    expect(kktpInput?.getAttribute('type')).toBe('number')

    wrapper.unmount()
  })

  it('sends material and kktp as null when left empty on create', async () => {
    const wrapper = renderDialog()
    await flushPromises()

    const nameInput = findFieldItem('Nama Tugas').querySelector('input')!
    await setControlValue(nameInput, 'UH 1')
    await submitForm()

    expect(assessmentItemApi.createAssessmentItem).toHaveBeenCalledWith(
      expect.objectContaining({
        teachingAssignmentId: 'ta-1',
        name: 'UH 1',
        material: null,
        kktp: null,
      }),
    )

    wrapper.unmount()
  })

  it('sends filled material and integer kktp on create', async () => {
    const wrapper = renderDialog()
    await flushPromises()

    const nameInput = findFieldItem('Nama Tugas').querySelector('input')!
    const materialInput = findFieldItem(
      'Ringkasan TP/Lingkup Materi',
    ).querySelector('textarea')!
    const kktpInput = findFieldItem(
      'Nilai Batas Ketercapaian (KKTP)',
    ).querySelector('input')!

    await setControlValue(nameInput, 'UH 2')
    await setControlValue(materialInput, 'Bilangan bulat dan pecahan')
    await setControlValue(kktpInput, '75')
    await submitForm()

    expect(assessmentItemApi.createAssessmentItem).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'UH 2',
        material: 'Bilangan bulat dan pecahan',
        kktp: 75,
      }),
    )

    wrapper.unmount()
  })

  it('sends kktp 0 as 0 and clears existing material/kktp to null on edit', async () => {
    const wrapper = renderDialog(
      makeItem({
        material: 'Materi lama',
        kktp: 75,
      }),
    )
    await flushPromises()

    const materialInput = findFieldItem(
      'Ringkasan TP/Lingkup Materi',
    ).querySelector('textarea')!
    const kktpInput = findFieldItem(
      'Nilai Batas Ketercapaian (KKTP)',
    ).querySelector('input')!

    expect(materialInput.value).toBe('Materi lama')
    expect(kktpInput.value).toBe('75')

    await setControlValue(materialInput, '')
    await setControlValue(kktpInput, '0')
    await submitForm()

    expect(assessmentItemApi.updateAssessmentItem).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        material: null,
        kktp: 0,
      }),
    )

    wrapper.unmount()
  })

  it('rejects kktp 101 and 7.5 client-side', async () => {
    const wrapper = renderDialog()
    await flushPromises()

    const nameInput = findFieldItem('Nama Tugas').querySelector('input')!
    const kktpField = findFieldItem('Nilai Batas Ketercapaian (KKTP)')
    const kktpInput = kktpField.querySelector('input')!

    await setControlValue(nameInput, 'UH 3')

    await setControlValue(kktpInput, '101')
    await submitForm()
    expect(assessmentItemApi.createAssessmentItem).not.toHaveBeenCalled()
    expect(kktpField.classList.contains('ff-error')).toBe(true)

    await setControlValue(kktpInput, '7.5')
    await submitForm()
    expect(assessmentItemApi.createAssessmentItem).not.toHaveBeenCalled()
    expect(kktpField.classList.contains('ff-error')).toBe(true)

    wrapper.unmount()
  })

  it('shows the rename warning only when editing an item with scores and changing the name', async () => {
    const createWrapper = renderDialog(null)
    await flushPromises()
    await setControlValue(
      findFieldItem('Nama Tugas').querySelector('input')!,
      'UH Baru',
    )
    expect(document.body.textContent).not.toContain(RENAME_WARNING)
    createWrapper.unmount()
    document.body.innerHTML = ''

    const noScoresWrapper = renderDialog(makeItem({ gradedCount: 0 }))
    await flushPromises()
    await setControlValue(
      findFieldItem('Nama Tugas').querySelector('input')!,
      'UH 1 Diubah',
    )
    expect(document.body.textContent).not.toContain(RENAME_WARNING)
    noScoresWrapper.unmount()
    document.body.innerHTML = ''

    const withScoresWrapper = renderDialog(makeItem({ gradedCount: 3 }))
    await flushPromises()
    const nameInput = findFieldItem('Nama Tugas').querySelector('input')!
    expect(document.body.textContent).not.toContain(RENAME_WARNING)

    await setControlValue(nameInput, '  uh 1  ')
    expect(document.body.textContent).not.toContain(RENAME_WARNING)

    await setControlValue(nameInput, 'UH 1 Revisi')
    expect(document.body.textContent).toContain(RENAME_WARNING)
    withScoresWrapper.unmount()
    document.body.innerHTML = ''

    const withCountWrapper = renderDialog(
      makeItem({ gradedCount: undefined, _count: { studentScores: 2 } }),
    )
    await flushPromises()
    await setControlValue(
      findFieldItem('Nama Tugas').querySelector('input')!,
      'UH 1 Baru',
    )
    expect(document.body.textContent).toContain(RENAME_WARNING)
    withCountWrapper.unmount()
  })

  it('shows duplicate-name and blank-name API errors on the name field instead of the alert', async () => {
    vi.mocked(assessmentItemApi.createAssessmentItem).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: 'Nama penilaian sudah dipakai di kelas dan mapel ini',
        },
      },
    })

    const wrapper = renderDialog()
    await flushPromises()

    const nameField = findFieldItem('Nama Tugas')
    const nameInput = nameField.querySelector('input')!
    await setControlValue(nameInput, 'UH 1')
    await submitForm()

    expect(nameField.textContent).toContain(
      'Nama penilaian sudah dipakai di kelas dan mapel ini',
    )
    expect(nameField.classList.contains('ff-error')).toBe(true)
    expect(
      document.body.querySelector('[data-slot="alert"]')?.textContent ?? '',
    ).not.toContain('Kesalahan Sistem')

    wrapper.unmount()
    document.body.innerHTML = ''

    vi.mocked(assessmentItemApi.updateAssessmentItem).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: 'Nama penilaian wajib diisi',
        },
      },
    })

    const editWrapper = renderDialog(makeItem())
    await flushPromises()

    const editNameField = findFieldItem('Nama Tugas')
    const editNameInput = editNameField.querySelector('input')!
    await setControlValue(editNameInput, '   ')
    await submitForm()

    expect(editNameField.textContent).toContain('Nama penilaian wajib diisi')
    expect(editNameField.classList.contains('ff-error')).toBe(true)

    editWrapper.unmount()
  })
})
