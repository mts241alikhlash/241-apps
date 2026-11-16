// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import PackageImportView from './PackageImportView.vue'
import type { ExamPackageView } from '../types'
import type { ImportPreview } from '@/features/exam-bank/types'

type Wrapper = Pick<VueWrapper, 'findAll' | 'get'>

const {
  push,
  replace,
  loadPackage,
  previewImport,
  importQuestions,
  downloadTemplate,
  loadReferences,
  permissions,
  user,
} = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  loadPackage: vi.fn(),
  previewImport: vi.fn(),
  importQuestions: vi.fn(),
  downloadTemplate: vi.fn(),
  loadReferences: vi.fn(),
  permissions: new Set<string>(),
  user: { value: { id: 'u1' } },
}))

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  const state = reactive({ params: { id: 'p1' } })
  return {
    useRouter: () => ({ push, replace }),
    useRoute: () => state,
  }
})
vi.mock('@mts241alikhlash/web-shared/composables/useBreadcrumbs', () => ({
  useBreadcrumbs: vi.fn(),
}))
vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({
    user,
    hasPermission: (code: string) => permissions.has(code),
  }),
}))
vi.mock('../services/examPackageService', () => ({
  examPackageService: { loadPackage },
}))
vi.mock('@/features/exam-bank/services/examBankService', () => ({
  examBankService: {
    loadReferences,
    previewImport,
    importQuestions,
    downloadTemplate,
  },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const dialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})
const field = defineComponent({
  template: '<div><slot /></div>',
})
const input = defineComponent({
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template:
    '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const button = defineComponent({
  props: { disabled: Boolean },
  template: '<button :disabled="disabled" type="button"><slot /></button>',
})
const dropzone = defineComponent({
  props: { fileName: String },
  emits: ['change', 'clear'],
  template:
    '<input type="file" data-testid="dropzone" @change="$emit(\'change\', $event)" />',
})
const stubs = {
  BackButton: button,
  Button: button,
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  CardFooter: passthrough,
  FileDropzone: dropzone,
  Dialog: dialog,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  DialogBody: passthrough,
  DialogFooter: passthrough,
  FloatingLabelField: field,
  Input: input,
}

const view = (overrides: Partial<ExamPackageView> = {}): ExamPackageView => ({
  id: 'p1',
  title: 'UAS Matematika',
  subjectId: 'math',
  gradeId: 'g7',
  status: 'DRAFT',
  lockedAt: null,
  createdById: 'u1',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
  reviews: [],
  items: [],
  ...overrides,
})

const preview = (overrides: Partial<ImportPreview> = {}): ImportPreview => ({
  authorName: 'Siti Aminah',
  canSave: true,
  counts: {
    MULTIPLE_CHOICE: 2,
    MULTIPLE_RESPONSE: 0,
    TRUE_FALSE: 0,
    SHORT_ANSWER: 0,
    ESSAY: 0,
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
  total: 2,
  totalPoints: 4,
  warnings: [],
  ...overrides,
})

async function choose(host: Wrapper, file: File) {
  const input = host.get('[data-testid="dropzone"]')
  Object.defineProperty(input.element, 'files', {
    value: [file],
    configurable: true,
  })
  await input.trigger('change')
  await flushPromises()
}

const findButton = (wrapper: Wrapper, text: string) =>
  wrapper.findAll('button').find((node) => node.text().includes(text))

const saveButton = (wrapper: Wrapper) => findButton(wrapper, 'Impor')!

async function mountView() {
  const wrapper = mount(PackageImportView, { global: { stubs } })
  await flushPromises()
  return wrapper
}

describe('PackageImportView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    permissions.clear()
    permissions.add('exam-packages.update')
    user.value = { id: 'u1' }
    loadPackage.mockResolvedValue(view())
    loadReferences.mockResolvedValue(undefined)
    previewImport.mockResolvedValue({ success: true, data: preview() })
  })

  it('previews the chosen file and does not import it yet', async () => {
    const wrapper = await mountView()
    const file = new File(['x'], 'soal.xlsx')

    await choose(wrapper, file)

    expect(previewImport).toHaveBeenCalledWith({ file, packageId: 'p1' })
    expect(importQuestions).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows the preview of the file', async () => {
    const wrapper = await mountView()

    await choose(wrapper, new File(['x'], 'soal.xlsx'))

    expect(wrapper.text()).toContain('Siti Aminah')
    expect(wrapper.text()).toContain('Total soal 2')
    wrapper.unmount()
  })

  it('keeps Impor disabled while the preview says it cannot be saved', async () => {
    previewImport.mockResolvedValue({
      success: true,
      data: preview({
        canSave: false,
        errors: [{ row: 2, reason: 'Isi soal wajib diisi' }],
      }),
    })
    const wrapper = await mountView()

    await choose(wrapper, new File(['x'], 'soal.xlsx'))

    expect(wrapper.text()).toContain('Baris 2: Isi soal wajib diisi')
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('enables Impor when the preview can be saved, and saves with no duplicate confirmation', async () => {
    importQuestions.mockResolvedValue({
      success: true,
      data: { created: 2, questionIds: ['a', 'b'], errors: [] },
    })
    const wrapper = await mountView()
    const file = new File(['x'], 'soal.xlsx')

    await choose(wrapper, file)
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    await saveButton(wrapper).trigger('click')
    await flushPromises()

    expect(importQuestions).toHaveBeenCalledWith({
      file,
      packageId: 'p1',
      confirmDuplicates: false,
    })
    wrapper.unmount()
  })

  it('needs the duplicate checkbox before saving a file with duplicates', async () => {
    previewImport.mockResolvedValue({
      success: true,
      data: preview({ canSave: false, duplicateRows: [3, 5] }),
    })
    importQuestions.mockResolvedValue({
      success: true,
      data: { created: 2, questionIds: ['a', 'b'], errors: [] },
    })
    const wrapper = await mountView()
    const file = new File(['x'], 'soal.xlsx')

    await choose(wrapper, file)
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.get('[role="checkbox"]').trigger('click')
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    await saveButton(wrapper).trigger('click')
    await flushPromises()

    expect(importQuestions).toHaveBeenCalledWith({
      file,
      packageId: 'p1',
      confirmDuplicates: true,
    })
    wrapper.unmount()
  })

  it('keeps Impor disabled when the preview has errors even with duplicates ticked', async () => {
    previewImport.mockResolvedValue({
      success: true,
      data: preview({
        canSave: false,
        duplicateRows: [3],
        errors: [{ row: 1, reason: 'Poin tidak valid' }],
      }),
    })
    const wrapper = await mountView()

    await choose(wrapper, new File(['x'], 'soal.xlsx'))
    await wrapper.get('[role="checkbox"]').trigger('click')

    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('says how many questions came in and lists each bad row', async () => {
    importQuestions.mockResolvedValue({
      success: true,
      data: {
        created: 3,
        questionIds: ['a', 'b', 'c'],
        errors: [
          { row: 4, reason: 'Kunci di luar pilihan' },
          { row: 9, reason: 'Poin tidak valid' },
        ],
      },
    })
    const wrapper = await mountView()
    await choose(wrapper, new File(['x'], 'soal.xlsx'))

    await saveButton(wrapper).trigger('click')
    await flushPromises()

    const result = wrapper.get('[data-testid="import-result"]').text()
    expect(result).toContain('3 soal ditambahkan ke paket')
    expect(result).toContain('2 baris gagal')
    const rows = wrapper.findAll('[data-testid="import-error"]')
    expect(rows.map((row) => row.text())).toEqual([
      'Baris 4: Kunci di luar pilihan',
      'Baris 9: Poin tidak valid',
    ])
    await findButton(wrapper, 'Kembali ke paket')!.trigger('click')
    expect(push).toHaveBeenCalledWith('/exam/packages/p1')
    wrapper.unmount()
  })

  it('stays on the page without a way back when nothing was created', async () => {
    importQuestions.mockResolvedValue({
      success: true,
      data: {
        created: 0,
        questionIds: [],
        errors: [{ row: 2, reason: 'Isi soal wajib diisi' }],
      },
    })
    const wrapper = await mountView()
    await choose(wrapper, new File(['x'], 'soal.xlsx'))

    await saveButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Baris 2: Isi soal wajib diisi')
    expect(findButton(wrapper, 'Kembali ke paket')).toBeUndefined()
    wrapper.unmount()
  })

  it('shows the server message when the package refuses the save', async () => {
    importQuestions.mockResolvedValue({
      success: false,
      error: 'Paket berstatus SUBMITTED dan tidak bisa diubah',
    })
    const wrapper = await mountView()
    await choose(wrapper, new File(['x'], 'soal.xlsx'))

    await saveButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Paket berstatus SUBMITTED')
    wrapper.unmount()
  })

  it('shows the server message when the file cannot be previewed', async () => {
    previewImport.mockResolvedValue({
      success: false,
      error: 'Versi template tidak sesuai',
    })
    const wrapper = await mountView()

    await choose(wrapper, new File(['x'], 'soal.xlsx'))

    expect(wrapper.text()).toContain('Versi template tidak sesuai')
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('has no author select', async () => {
    const wrapper = await mountView()

    expect(wrapper.text()).not.toContain('Penulis')
    wrapper.unmount()
  })

  it('refuses a file that is neither Excel nor Word, and one that is too large', async () => {
    const wrapper = await mountView()

    await choose(wrapper, new File(['x'], 'soal.pdf'))
    expect(wrapper.text()).toContain('Berkas harus .xlsx atau .docx.')

    const big = new File(['x'], 'besar.xlsx')
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 })
    await choose(wrapper, big)
    expect(wrapper.text()).toContain('Ukuran berkas maksimal 10 MB.')
    expect(previewImport).not.toHaveBeenCalled()
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('offers both templates', async () => {
    const wrapper = await mountView()

    await findButton(wrapper, 'Template Excel')!.trigger('click')
    await findButton(wrapper, 'Template Word')!.trigger('click')

    expect(downloadTemplate).toHaveBeenCalledWith('xlsx')
    expect(downloadTemplate).toHaveBeenCalledWith('docx')
    wrapper.unmount()
  })

  it('opens the vertical template dialog with the standard counts', async () => {
    const wrapper = await mountView()

    await findButton(wrapper, 'Template Word (vertikal)')!.trigger('click')

    const values = wrapper
      .findAll('input[type="number"]')
      .map((node) => (node.element as HTMLInputElement).value)
    expect(values).toEqual(['20', '10', '10', '0', '5'])
    wrapper.unmount()
  })

  it('downloads the vertical template with the counts typed in the dialog', async () => {
    const wrapper = await mountView()
    await findButton(wrapper, 'Template Word (vertikal)')!.trigger('click')

    await wrapper.findAll('input[type="number"]')[0].setValue('18')
    await findButton(wrapper, 'Unduh')!.trigger('click')

    expect(downloadTemplate).toHaveBeenCalledWith('docx', {
      layout: 'vertical',
      counts: { pg: 18, pgKompleks: 10, benarSalah: 10, isian: 0, uraian: 5 },
    })
    wrapper.unmount()
  })

  it('disables the vertical template download for a count outside 0 to 100', async () => {
    const wrapper = await mountView()
    await findButton(wrapper, 'Template Word (vertikal)')!.trigger('click')

    await wrapper.findAll('input[type="number"]')[1].setValue('101')

    expect(findButton(wrapper, 'Unduh')!.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('shows a count warning as a note and keeps Impor enabled', async () => {
    previewImport.mockResolvedValue({
      success: true,
      data: preview({ canSave: true, warnings: ['PG 18 dari 20'] }),
    })
    const wrapper = await mountView()

    await choose(wrapper, new File(['x'], 'soal.docx'))

    expect(wrapper.get('[data-testid="import-preview"]').text()).toContain(
      'PG 18 dari 20',
    )
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('cannot import into a package that waits for review', async () => {
    loadPackage.mockResolvedValue(view({ status: 'SUBMITTED' }))
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Paket ini tidak bisa diubah')
    expect(findButton(wrapper, 'Impor')).toBeUndefined()
    wrapper.unmount()
  })

  it('goes to the list when the package does not exist', async () => {
    loadPackage.mockResolvedValue(null)

    const wrapper = await mountView()

    expect(replace).toHaveBeenCalledWith('/exam/packages')
    wrapper.unmount()
  })
})
