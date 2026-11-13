// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import * as vueRouter from 'vue-router'
import PackageDetailView from './PackageDetailView.vue'
import { useExamPackageStore } from '../stores/examPackageStore'
import type { ExamPackageView } from '../types'
import { CARDS, cardRows } from '@/test/dataTableCards'

type Wrapper = Pick<VueWrapper, 'findAll' | 'get'>

const {
  push,
  loadPackage,
  copyPackage,
  deletePackage,
  loadReferences,
  submit,
  removeQuestion,
  permissions,
  user,
} = vi.hoisted(() => ({
  push: vi.fn(),
  loadPackage: vi.fn(),
  copyPackage: vi.fn(),
  deletePackage: vi.fn(),
  loadReferences: vi.fn(),
  submit: vi.fn(),
  removeQuestion: vi.fn(),
  permissions: new Set<string>(),
  user: { value: { id: 'u1' } },
}))

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  const state = reactive<{ params: Record<string, string> }>({
    params: { id: 'p1' },
  })
  return { useRouter: () => ({ push }), useRoute: () => state, __route: state }
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
  examPackageService: {
    loadPackage,
    copyPackage,
    deletePackage,
    loadReferences,
    submit,
    removeQuestion,
  },
}))
vi.mock('@/features/exam-bank/services/examBankService', () => ({
  examBankService: { loadReferences: vi.fn() },
}))
vi.mock('@/features/exam-schedule/components/ScheduleFormDialog.vue', () => ({
  default: defineComponent({
    name: 'ScheduleFormDialogStub',
    props: {
      open: Boolean,
      packageId: String,
      packageGradeId: String,
      packageTitle: String,
    },
    emits: ['update:open', 'saved'],
    template:
      '<div data-test="schedule-dialog" :data-package="packageId" :data-grade="packageGradeId" :data-title="packageTitle" />',
  }),
}))
vi.mock('../components/TakeQuestionsDialog.vue', () => ({
  default: defineComponent({
    name: 'TakeQuestionsDialogStub',
    props: {
      open: Boolean,
      packageId: String,
      subjectId: String,
      gradeId: String,
    },
    emits: ['update:open', 'taken'],
    template:
      '<div data-test="take-dialog" :data-package="packageId" :data-subject="subjectId" :data-grade="gradeId" />',
  }),
}))
vi.mock('../components/RenamePackageDialog.vue', () => ({
  default: defineComponent({
    name: 'RenamePackageDialogStub',
    props: { open: Boolean },
    template: '<div data-test="rename-dialog" />',
  }),
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean, type: String },
  template: '<button :disabled="disabled" type="button"><slot /></button>',
})
const backButton = defineComponent({
  props: { label: String },
  template: '<button type="button">{{ label }}</button>',
})
const alertDialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open" data-test="confirm"><slot /></div>',
})
const menuItem = defineComponent({
  emits: ['select'],
  template:
    '<button type="button" @click="$emit(\'select\')"><slot /></button>',
})

const stubs = {
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  Tooltip: passthrough,
  TooltipTrigger: passthrough,
  TooltipContent: passthrough,
  BackButton: backButton,
  Button: button,
  AlertDialog: alertDialog,
  AlertDialogContent: passthrough,
  AlertDialogHeader: passthrough,
  AlertDialogFooter: passthrough,
  AlertDialogTitle: passthrough,
  AlertDialogDescription: passthrough,
  AlertDialogCancel: button,
  AlertDialogAction: button,
  DropdownMenu: passthrough,
  DropdownMenuTrigger: passthrough,
  DropdownMenuContent: passthrough,
  DropdownMenuItem: menuItem,
}

const routeState = () =>
  (vueRouter as unknown as { __route: { params: Record<string, string> } })
    .__route

const view = (overrides: Partial<ExamPackageView> = {}): ExamPackageView => ({
  id: 'p1',
  title: 'UTS Matematika Kelas 7',
  subjectId: 'math',
  gradeId: 'g7',
  status: 'DRAFT',
  lockedAt: null,
  createdById: 'u1',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
  reviews: [],
  items: [
    {
      questionId: 'q1',
      questionVersion: 1,
      position: 1,
      type: 'TRUE_FALSE',
      marker: 'NEW',
      summary: 'Langit berwarna biru',
      points: 2,
    },
    {
      questionId: 'q2',
      questionVersion: 3,
      position: 2,
      type: 'ESSAY',
      marker: 'COPIED',
      summary: 'Jelaskan fotosintesis',
      points: 5,
    },
  ],
  ...overrides,
})

const buttonByText = (host: unknown, text: string) =>
  (host as Wrapper)
    .findAll('button')
    .find(
      (candidateButton) =>
        candidateButton.text() === text ||
        candidateButton.attributes('aria-label') === text,
    )

async function mountView() {
  const wrapper = mount(PackageDetailView, { global: { stubs } })
  await flushPromises()
  return wrapper
}

describe('PackageDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useExamPackageStore()
    store.subjects = [{ id: 'math', name: 'Matematika' }]
    store.grades = [{ id: 'g7', level: 7, name: '' }]
    vi.clearAllMocks()
    permissions.clear()
    for (const code of [
      'exam-packages.read',
      'exam-packages.update',
      'exam-packages.delete',
      'exam-packages.create',
      'exam-questions.create',
      'exam-schedules.create',
    ]) {
      permissions.add(code)
    }
    user.value = { id: 'u1' }
    routeState().params = { id: 'p1' }
    loadPackage.mockResolvedValue(view())
  })

  it('shows every question with its origin, kind and points', async () => {
    const wrapper = await mountView()

    const text = wrapper.get(CARDS).text()
    expect(cardRows(wrapper)).toHaveLength(2)
    expect(text).toContain('Langit berwarna biru')
    expect(text).toContain('Baru')
    expect(text).toContain('Salinan')
    expect(wrapper.get('dl').text()).toContain('Matematika')
    expect(wrapper.text()).toContain('Draf')
    expect(wrapper.get('dl').text()).toContain('Poin7')
    wrapper.unmount()
  })

  it('lets the creator add, take and import questions, and leaves package actions to the list', async () => {
    const wrapper = await mountView()

    expect(buttonByText(wrapper, 'Tambah')).toBeDefined()
    expect(buttonByText(wrapper, 'Ambil soal')).toBeDefined()
    for (const text of ['Ganti judul', 'Ajukan', 'Salin', 'Jadwalkan']) {
      expect(buttonByText(wrapper, text)).toBeUndefined()
    }
    wrapper.unmount()
  })

  it('keeps take and import reachable once the package has questions', async () => {
    const wrapper = await mountView()

    expect(cardRows(wrapper)).toHaveLength(2)
    expect(buttonByText(wrapper, 'Ambil dari paket lain')).toBeDefined()
    expect(buttonByText(wrapper, 'Impor Excel/Word')).toBeDefined()
    wrapper.unmount()
  })

  it('goes to the question form and the import from the add menu', async () => {
    const wrapper = await mountView()

    await buttonByText(wrapper, 'Tambah')!.trigger('click')
    await buttonByText(wrapper, 'Impor Excel/Word')!.trigger('click')

    expect(push).toHaveBeenCalledWith('/exam/packages/p1/questions/new')
    expect(push).toHaveBeenCalledWith('/exam/packages/p1/import')
    wrapper.unmount()
  })

  it('opens the take dialog for this package from the add menu', async () => {
    const wrapper = await mountView()
    expect(wrapper.find('[data-test="take-dialog"]').exists()).toBe(false)

    await buttonByText(wrapper, 'Ambil dari paket lain')!.trigger('click')

    const dialog = wrapper.get('[data-test="take-dialog"]')
    expect(dialog.attributes('data-package')).toBe('p1')
    expect(dialog.attributes('data-subject')).toBe('math')
    expect(dialog.attributes('data-grade')).toBe('g7')
    wrapper.unmount()
  })

  it('hides the import without exam-questions.create', async () => {
    permissions.delete('exam-questions.create')
    const wrapper = await mountView()

    expect(buttonByText(wrapper, 'Impor Excel/Word')).toBeUndefined()
    wrapper.unmount()
  })

  it('is read-only without exam-packages.update', async () => {
    permissions.delete('exam-packages.update')
    const wrapper = await mountView()

    for (const text of ['Tambah', 'Ambil soal']) {
      expect(buttonByText(wrapper, text)).toBeUndefined()
    }
    expect(wrapper.text()).toContain('Langit berwarna biru')
    wrapper.unmount()
  })

  it('is read-only for a colleague and open to someone who manages every package', async () => {
    user.value = { id: 'u2' }
    const colleague = await mountView()
    expect(buttonByText(colleague, 'Tambah')).toBeUndefined()
    colleague.unmount()

    permissions.add('exam-questions.manage-all')
    const manager = await mountView()
    expect(buttonByText(manager, 'Tambah')).toBeDefined()
    manager.unmount()
  })

  it('freezes a package that waits for review', async () => {
    loadPackage.mockResolvedValue(view({ status: 'SUBMITTED' }))
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Menunggu tinjauan')
    for (const text of ['Tambah', 'Ambil soal']) {
      expect(buttonByText(wrapper, text)).toBeUndefined()
    }
    wrapper.unmount()
  })

  it('warns the creator that changing an approved package takes the approval back', async () => {
    loadPackage.mockResolvedValue(view({ status: 'APPROVED' }))
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('kembali menjadi draf')
    wrapper.unmount()

    loadPackage.mockResolvedValue(view({ status: 'DRAFT' }))
    const draft = await mountView()
    expect(draft.text()).not.toContain('kembali menjadi draf')
    draft.unmount()
  })

  it('shows the return note and the note of the returned question', async () => {
    loadPackage.mockResolvedValue(
      view({
        status: 'RETURNED',
        reviews: [
          {
            id: 'r1',
            action: 'RETURN',
            byUserId: 'u9',
            note: 'Perbaiki soal kedua',
            questionNotes: [{ questionId: 'q2', note: 'Kunci salah' }],
            createdAt: '2026-10-29T02:00:00.000Z',
          },
        ],
      }),
    )
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Dikembalikan oleh penyetuju')
    expect(wrapper.text()).toContain('Perbaiki soal kedua')
    const rows = cardRows(wrapper)
    expect(rows[1].text()).toContain('Catatan: Kunci salah')
    expect(rows[0].text()).not.toContain('Catatan:')
    wrapper.unmount()
  })

  it('shows a not-found state for a missing package or another teacher’s draft', async () => {
    loadPackage.mockResolvedValue(null)
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Paket tidak ditemukan.')
    expect(buttonByText(wrapper, 'Tambah')).toBeUndefined()
    wrapper.unmount()
  })

  it('offers a retry when the package cannot be loaded', async () => {
    loadPackage.mockRejectedValueOnce(new Error('down'))
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('Paket tidak dapat dimuat.')

    loadPackage.mockResolvedValue(view())
    await buttonByText(wrapper, 'Coba lagi')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Langit berwarna biru')
    wrapper.unmount()
  })

  it('loads the other package when the address changes, as after Salin from a locked package', async () => {
    loadPackage.mockResolvedValueOnce(view({ status: 'LOCKED' }))
    const wrapper = await mountView()
    expect(buttonByText(wrapper, 'Tambah')).toBeUndefined()

    loadPackage.mockResolvedValueOnce(
      view({ id: 'p2', title: 'Salinan UTS Matematika', status: 'DRAFT' }),
    )
    routeState().params = { id: 'p2' }
    await flushPromises()

    expect(loadPackage).toHaveBeenLastCalledWith('p2')
    expect(wrapper.text()).toContain('Salinan UTS Matematika')
    expect(buttonByText(wrapper, 'Tambah')).toBeDefined()
    wrapper.unmount()
  })
})
