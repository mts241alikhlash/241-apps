// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import PackageImportView from './PackageImportView.vue'
import type { ExamPackageView } from '../types'

type Wrapper = Pick<VueWrapper, 'findAll' | 'get'>

const {
  push,
  replace,
  loadPackage,
  importQuestions,
  downloadTemplate,
  loadReferences,
  loadTeachers,
  permissions,
  user,
} = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  loadPackage: vi.fn(),
  importQuestions: vi.fn(),
  downloadTemplate: vi.fn(),
  loadReferences: vi.fn(),
  loadTeachers: vi.fn(),
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
vi.mock('@/features/platform/auth', () => ({
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
    importQuestions,
    downloadTemplate,
    loadTeachers,
  },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
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
  FloatingLabelField: passthrough,
  FileDropzone: dropzone,
  Select: passthrough,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
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

async function choose(host: Wrapper, file: File) {
  const input = host.get('[data-testid="dropzone"]')
  Object.defineProperty(input.element, 'files', {
    value: [file],
    configurable: true,
  })
  await input.trigger('change')
}

const findButton = (wrapper: Wrapper, text: string) =>
  wrapper.findAll('button').find((node) => node.text().includes(text))

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
  })

  it('posts the chosen file with the id of the package, and no subject or grade', async () => {
    importQuestions.mockResolvedValue({
      success: true,
      data: { created: 2, questionIds: ['a', 'b'], errors: [] },
    })
    const wrapper = await mountView()
    const file = new File(['x'], 'soal.xlsx')

    await choose(wrapper, file)
    await findButton(wrapper, 'Impor')!.trigger('click')
    await flushPromises()

    expect(importQuestions).toHaveBeenCalledWith({
      file,
      packageId: 'p1',
      authorEmployeeId: undefined,
    })
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

    await findButton(wrapper, 'Impor')!.trigger('click')
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

    await findButton(wrapper, 'Impor')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Baris 2: Isi soal wajib diisi')
    expect(findButton(wrapper, 'Kembali ke paket')).toBeUndefined()
    wrapper.unmount()
  })

  it('shows the server message when the package refuses the file', async () => {
    importQuestions.mockResolvedValue({
      success: false,
      error: 'Paket berstatus SUBMITTED dan tidak bisa diubah',
    })
    const wrapper = await mountView()
    await choose(wrapper, new File(['x'], 'soal.xlsx'))

    await findButton(wrapper, 'Impor')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Paket berstatus SUBMITTED')
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
    expect(findButton(wrapper, 'Impor')!.attributes('disabled')).toBeDefined()
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
