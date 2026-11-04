// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import * as vueRouter from 'vue-router'
import { useExamBankStore } from '@/features/exam-bank/stores/examBankStore'
import PackageQuestionFormView from './PackageQuestionFormView.vue'
import type { ExamPackageView } from '../types'

type Wrapper = Pick<VueWrapper, 'findAll' | 'get'>

const {
  push,
  replace,
  loadPackage,
  loadQuestion,
  addQuestion,
  updateQuestion,
  loadReferences,
  permissions,
  user,
  bankReferences,
  loadTeachers,
} = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  loadPackage: vi.fn(),
  loadQuestion: vi.fn(),
  addQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  loadReferences: vi.fn(),
  permissions: new Set<string>(),
  user: { value: { id: 'u1' } },
  bankReferences: vi.fn(),
  loadTeachers: vi.fn(),
}))

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  const state = reactive<{ params: Record<string, string> }>({
    params: { id: 'p1' },
  })
  return {
    useRouter: () => ({ push, replace }),
    useRoute: () => state,
    __route: state,
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
  examPackageService: {
    loadPackage,
    loadQuestion,
    addQuestion,
    updateQuestion,
    loadReferences,
  },
}))
vi.mock('@/features/exam-bank/services/examBankService', () => ({
  examBankService: { loadReferences: bankReferences, loadTeachers },
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
const field = defineComponent({
  props: { label: String, for: String, floating: Boolean, error: String },
  template: '<div><label :for="$props.for">{{ label }}</label><slot /></div>',
})
const select = defineComponent({
  name: 'SelectStub',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: '<div><slot /></div>',
})
const editor = defineComponent({
  name: 'QuestionEditorStub',
  props: { modelValue: Object, type: String },
  emits: ['update:modelValue'],
  methods: {
    fill() {
      const content =
        this.type === 'TRUE_FALSE'
          ? { answer: { value: true } }
          : {
              choices: [
                { key: 'A', html: '<p>a</p>' },
                { key: 'B', html: '<p>b</p>' },
              ],
              answer: { key: 'A' },
            }
      this.$emit('update:modelValue', {
        bodyHtml: '<p>Bumi bulat</p>',
        content,
        points: 2,
      })
    },
  },
  template:
    '<button type="button" data-test="fill" @click="fill">isi soal</button>',
})
const preview = defineComponent({
  props: { bodyHtml: String },
  template: '<div data-test="preview">{{ bodyHtml }}</div>',
})

const stubs = {
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  CardFooter: passthrough,
  BackButton: backButton,
  Button: button,
  Badge: passthrough,
  FloatingLabelField: field,
  Select: select,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  QuestionEditor: editor,
  QuestionPreview: preview,
  AnswerKey: passthrough,
}

const routeState = () =>
  (vueRouter as unknown as { __route: { params: Record<string, string> } })
    .__route

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

const question = {
  id: 'q1',
  packageId: 'p1',
  type: 'TRUE_FALSE',
  currentVersion: 2,
  current: {
    number: 2,
    bodyHtml: '<p>Langit biru</p>',
    content: { answer: { value: true } },
    points: 3,
  },
}

const buttonByText = (host: Wrapper, text: string) =>
  host.findAll('button').find((candidate) => candidate.text() === text)

async function mountView() {
  const wrapper = mount(PackageQuestionFormView, { global: { stubs } })
  await flushPromises()
  return wrapper
}

describe('PackageQuestionFormView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    permissions.clear()
    permissions.add('exam-packages.update')
    user.value = { id: 'u1' }
    routeState().params = { id: 'p1' }
    loadPackage.mockResolvedValue(view())
    loadQuestion.mockResolvedValue(question)
  })

  it('refuses an empty question with the reason and does not call the server', async () => {
    const wrapper = await mountView()

    await buttonByText(wrapper, 'Simpan')!.trigger('click')

    expect(wrapper.text()).toContain('Isi soal wajib diisi')
    expect(addQuestion).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('writes a new question into the package and goes back to it', async () => {
    addQuestion.mockResolvedValue({ success: true, data: view() })
    const wrapper = await mountView()
    await wrapper.get('[data-test="fill"]').trigger('click')

    await buttonByText(wrapper, 'Simpan')!.trigger('click')
    await flushPromises()

    expect(addQuestion).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        type: 'MULTIPLE_CHOICE',
        bodyHtml: '<p>Bumi bulat</p>',
        points: 2,
      }),
    )
    expect(push).toHaveBeenCalledWith('/exam/packages/p1')
    wrapper.unmount()
  })

  it('loads the scope before deciding to offer an author, so a fresh page load still shows it', async () => {
    permissions.add('exam-questions.manage-all')
    bankReferences.mockImplementation(() => {
      useExamBankStore().scope = { all: true, employeeId: null, pairs: [] }
      return Promise.resolve()
    })
    loadTeachers.mockResolvedValue([{ id: 'e1', name: 'Bu Sari' }])

    const wrapper = await mountView()

    expect(loadTeachers).toHaveBeenCalledWith('math')
    expect(wrapper.text()).toContain('Penulis')
    wrapper.unmount()
  })

  it('warns that a change to an approved package takes its approval back', async () => {
    loadPackage.mockResolvedValue(view({ status: 'APPROVED' }))
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('kembali menjadi draf')
    wrapper.unmount()
  })

  it('keeps the server message and stays when the package refuses', async () => {
    addQuestion.mockResolvedValue({
      success: false,
      error: 'Paket ini disusun guru lain',
    })
    const wrapper = await mountView()
    await wrapper.get('[data-test="fill"]').trigger('click')

    await buttonByText(wrapper, 'Simpan')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Paket ini disusun guru lain')
    expect(push).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('loads an existing question, saves a change and goes back', async () => {
    routeState().params = { id: 'p1', questionId: 'q1' }
    updateQuestion.mockResolvedValue({ success: true, data: view() })
    const wrapper = await mountView()
    expect(loadQuestion).toHaveBeenCalledWith('p1', 'q1')

    await wrapper.get('[data-test="fill"]').trigger('click')
    await buttonByText(wrapper, 'Simpan')!.trigger('click')
    await flushPromises()

    expect(updateQuestion).toHaveBeenCalledWith(
      'p1',
      'q1',
      expect.objectContaining({ bodyHtml: '<p>Bumi bulat</p>', points: 2 }),
    )
    expect(push).toHaveBeenCalledWith('/exam/packages/p1')
    wrapper.unmount()
  })

  it('goes back to the package when the question is not in it', async () => {
    routeState().params = { id: 'p1', questionId: 'q9' }
    loadQuestion.mockResolvedValue(null)

    const wrapper = await mountView()

    expect(replace).toHaveBeenCalledWith('/exam/packages/p1')
    wrapper.unmount()
  })

  it('shows the question read-only when the package cannot be changed', async () => {
    routeState().params = { id: 'p1', questionId: 'q1' }
    loadPackage.mockResolvedValue(view({ status: 'SUBMITTED' }))

    const wrapper = await mountView()

    expect(wrapper.get('[data-test="preview"]').text()).toContain('Langit biru')
    expect(buttonByText(wrapper, 'Simpan')).toBeUndefined()
    expect(wrapper.find('[data-test="fill"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows the note the reviewer left on this question', async () => {
    routeState().params = { id: 'p1', questionId: 'q1' }
    loadPackage.mockResolvedValue(
      view({
        status: 'RETURNED',
        reviews: [
          {
            id: 'r1',
            action: 'RETURN',
            byUserId: 'u9',
            note: 'Perbaiki',
            questionNotes: [{ questionId: 'q1', note: 'Kunci salah' }],
            createdAt: '2026-10-29T02:00:00.000Z',
          },
        ],
      }),
    )

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Catatan penyetuju: Kunci salah')
    wrapper.unmount()
  })

  it('explains why a new question cannot be added to a package that waits for review', async () => {
    loadPackage.mockResolvedValue(view({ status: 'SUBMITTED' }))
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('soal baru tidak bisa ditambahkan')
    expect(wrapper.text()).not.toContain('Jenis')
    wrapper.unmount()
  })
})
