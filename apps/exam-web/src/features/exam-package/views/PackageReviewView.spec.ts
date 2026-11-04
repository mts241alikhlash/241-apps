// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import PackageReviewView from './PackageReviewView.vue'
import { useExamPackageStore } from '../stores/examPackageStore'
import type { ExamPackageView } from '../types'

type Wrapper = Pick<VueWrapper, 'findAll' | 'get'>

const {
  push,
  replace,
  loadPackage,
  loadQuestion,
  approve,
  returnPackage,
  loadReferences,
} = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  loadPackage: vi.fn(),
  loadQuestion: vi.fn(),
  approve: vi.fn(),
  returnPackage: vi.fn(),
  loadReferences: vi.fn(),
}))

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  const state = reactive({ params: { id: 'p1' } })
  return { useRouter: () => ({ push, replace }), useRoute: () => state }
})
vi.mock('@mts241alikhlash/web-shared/composables/useBreadcrumbs', () => ({
  useBreadcrumbs: vi.fn(),
}))
const { invalidate, userId } = vi.hoisted(() => ({
  invalidate: vi.fn(),
  userId: { value: 'u5' },
}))
vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidate }),
}))
vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({ user: { value: { id: userId.value } } }),
}))
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../services/examPackageService', () => ({
  examPackageService: {
    loadPackage,
    loadQuestion,
    approve,
    returnPackage,
    loadReferences,
  },
}))
vi.mock('../components/ReturnPackageDialog.vue', () => ({
  default: defineComponent({
    name: 'ReturnPackageDialogStub',
    props: { open: Boolean, noteCount: Number, error: String },
    emits: ['update:open', 'confirm'],
    template:
      '<div v-if="open" data-test="return-dialog" :data-notes="noteCount"><button data-test="confirm-return" @click="$emit(\'confirm\', \'Perbaiki\')">kembalikan</button></div>',
  }),
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  template: '<button :disabled="disabled" type="button"><slot /></button>',
})
const preview = defineComponent({
  props: { bodyHtml: String },
  template: '<div data-test="preview">{{ bodyHtml }}</div>',
})
const textarea = defineComponent({
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template:
    '<textarea data-test="note" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const stubs = {
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  CardFooter: passthrough,
  BackButton: button,
  Button: button,
  Badge: passthrough,
  FloatingLabelField: passthrough,
  Textarea: textarea,
  QuestionPreview: preview,
  AnswerKey: passthrough,
}

const view = (
  status: ExamPackageView['status'] = 'SUBMITTED',
): ExamPackageView => ({
  id: 'p1',
  title: 'UAS Matematika',
  subjectId: 'math',
  gradeId: 'g7',
  status,
  lockedAt: null,
  createdById: 'u1',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
  reviews: [],
  items: ['NEW', 'COPIED', 'CHANGED'].map((marker, index) => ({
    questionId: `q${index + 1}`,
    questionVersion: 1,
    position: index + 1,
    type: 'TRUE_FALSE' as const,
    marker: marker as 'NEW' | 'COPIED' | 'CHANGED',
    summary: `Soal ${index + 1}`,
    points: 2,
  })),
})

const buttonByText = (host: Wrapper, text: string) =>
  host.findAll('button').find((candidate) => candidate.text() === text)

async function mountView() {
  const wrapper = mount(PackageReviewView, { global: { stubs } })
  await flushPromises()
  return wrapper
}

describe('PackageReviewView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useExamPackageStore().subjects = [{ id: 'math', name: 'Matematika' }]
    vi.clearAllMocks()
    loadPackage.mockResolvedValue(view())
    loadQuestion.mockImplementation((_id: string, questionId: string) =>
      Promise.resolve({
        id: questionId,
        type: 'TRUE_FALSE',
        current: {
          bodyHtml: `<p>Isi ${questionId}</p>`,
          content: { answer: { value: true } },
          points: 2,
        },
      }),
    )
  })

  it('reads every question of the package with its origin', async () => {
    const wrapper = await mountView()

    const previews = wrapper
      .findAll('[data-test="preview"]')
      .map((p) => p.text())
    expect(previews).toEqual([
      '<p>Isi q1</p>',
      '<p>Isi q2</p>',
      '<p>Isi q3</p>',
    ])
    expect(wrapper.text()).toContain('Baru')
    expect(wrapper.text()).toContain('Salinan')
    expect(wrapper.text()).toContain('Diubah')
    wrapper.unmount()
  })

  it('refreshes the cached lists after a decision so the package leaves the review list', async () => {
    approve.mockResolvedValue({ success: true, data: view() })
    const wrapper = await mountView()

    await buttonByText(wrapper, 'Setujui')!.trigger('click')
    await flushPromises()

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['exam-package', 'packages'],
    })
    wrapper.unmount()
  })

  it('does not offer to approve the package the reviewer wrote, but still lets them return it', async () => {
    userId.value = 'u1'
    const wrapper = await mountView()

    expect(buttonByText(wrapper, 'Setujui')).toBeUndefined()
    expect(wrapper.text()).toContain('Anda menyusun paket ini')
    expect(buttonByText(wrapper, 'Kembalikan')).toBeDefined()
    wrapper.unmount()
    userId.value = 'u5'
  })

  it('approves and goes back to the review list', async () => {
    approve.mockResolvedValue({ success: true, data: view() })
    const wrapper = await mountView()

    await buttonByText(wrapper, 'Setujui')!.trigger('click')
    await flushPromises()

    expect(approve).toHaveBeenCalledWith('p1', undefined)
    expect(push).toHaveBeenCalledWith('/exam/package-approvals')
    wrapper.unmount()
  })

  it('stays on the page and shows the message when approving is refused', async () => {
    approve.mockResolvedValue({
      success: false,
      error: 'Anda tidak bisa menyetujui paket yang Anda susun sendiri',
    })
    const wrapper = await mountView()

    await buttonByText(wrapper, 'Setujui')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'tidak bisa menyetujui paket yang Anda susun sendiri',
    )
    expect(push).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('returns the package with the notes typed on questions', async () => {
    returnPackage.mockResolvedValue({ success: true, data: view() })
    const wrapper = await mountView()
    await wrapper.findAll('[data-test="note"]')[1].setValue('Kunci salah')

    await buttonByText(wrapper, 'Kembalikan')!.trigger('click')
    expect(
      wrapper.get('[data-test="return-dialog"]').attributes('data-notes'),
    ).toBe('1')
    await wrapper.get('[data-test="confirm-return"]').trigger('click')
    await flushPromises()

    expect(returnPackage).toHaveBeenCalledWith('p1', {
      note: 'Perbaiki',
      questionNotes: [{ questionId: 'q2', note: 'Kunci salah' }],
    })
    expect(push).toHaveBeenCalledWith('/exam/package-approvals')
    wrapper.unmount()
  })

  it('offers no decision for a package that is not waiting for review', async () => {
    loadPackage.mockResolvedValue(view('APPROVED'))
    const wrapper = await mountView()

    expect(buttonByText(wrapper, 'Setujui')).toBeUndefined()
    expect(buttonByText(wrapper, 'Kembalikan')).toBeUndefined()
    expect(wrapper.text()).toContain('Paket ini tidak sedang menunggu tinjauan')
    wrapper.unmount()
  })

  it('goes to the review list when the package does not exist', async () => {
    loadPackage.mockResolvedValue(null)

    const wrapper = await mountView()

    expect(replace).toHaveBeenCalledWith('/exam/package-approvals')
    wrapper.unmount()
  })

  it('holds back both decisions and says so when a question cannot be loaded', async () => {
    loadQuestion.mockImplementation((_id: string, questionId: string) =>
      questionId === 'q2'
        ? Promise.reject(new Error('down'))
        : Promise.resolve({
            id: questionId,
            type: 'TRUE_FALSE',
            current: {
              bodyHtml: '<p>x</p>',
              content: { answer: { value: true } },
              points: 2,
            },
          }),
    )
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('1 soal tidak bisa dimuat')
    expect(
      buttonByText(wrapper, 'Setujui')!.attributes('disabled'),
    ).toBeDefined()
    expect(
      buttonByText(wrapper, 'Kembalikan')!.attributes('disabled'),
    ).toBeDefined()
    wrapper.unmount()
  })
})
