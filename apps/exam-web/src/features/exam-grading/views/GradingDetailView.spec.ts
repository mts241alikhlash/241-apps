// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { ActionCell } from '@mts241alikhlash/ui'
import GradingDetailView from './GradingDetailView.vue'
import type { GradingDetail } from '../types'

const { loadSession, permissions, push } = vi.hoisted(() => ({
  loadSession: vi.fn(),
  permissions: new Set<string>(),
  push: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    meta: { category: 'EXAM' },
    params: { scheduleId: 'sch-1', sessionId: 'ses-1' },
    query: {},
  }),
  useRouter: () => ({
    push,
    resolve: () => ({ href: '/exam/grading/sch-1' }),
  }),
}))

vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: (code: string) => permissions.has(code),
  }),
}))

vi.mock('@mts241alikhlash/web-shared/composables/useBreadcrumbs', () => ({
  useBreadcrumbs: () => undefined,
}))

vi.mock('../services/examGradingService', () => ({
  examGradingService: { loadSession },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  template: '<button :disabled="disabled"><slot /></button>',
})

const stubs = {
  BackButton: passthrough,
  Button: button,
  Card: passthrough,
  CardContent: passthrough,
  CardFooter: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  FloatingLabelField: passthrough,
  Select: passthrough,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  GradeItemDialog: defineComponent({
    name: 'GradeItemDialog',
    props: { open: Boolean, canGrade: Boolean },
    template:
      '<div data-test="grade-dialog" :data-can-grade="String(canGrade)" />',
  }),
  Tooltip: passthrough,
  TooltipProvider: passthrough,
  TooltipTrigger: passthrough,
  TooltipContent: passthrough,
}

const sampleDetail: GradingDetail = {
  session: {
    scheduleId: 'sch-1',
    sessionId: 'ses-1',
    studentId: 'stu-1',
    studentName: 'Ahmad',
    studentNis: '1001',
    participantNumber: '26-0001',
    status: 'SUBMITTED',
    rawScore: 80,
    maxScore: 100,
  },
  items: [
    {
      questionId: 'q-essay',
      number: 1,
      type: 'ESSAY',
      bodyHtml: '<p>Jelaskan</p>',
      points: 10,
      manual: true,
      needsGrading: true,
      score: null,
      note: null,
      gradedAt: null,
      answer: { text: 'Jawaban siswa' },
      choices: null,
      correctKeys: null,
      correctValue: null,
      acceptedAnswers: null,
      guideHtml: null,
    },
  ],
}

describe('GradingDetailView read-only vs grade permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissions.clear()
    loadSession.mockResolvedValue({ success: true, data: sampleDetail })
  })

  it('shows read-only notice and Lihat label without exam-grading.grade', async () => {
    permissions.add('exam-grading.read')
    permissions.add('exam-grading.read-all')
    const wrapper = mount(GradingDetailView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Anda hanya bisa melihat jawaban; menilai butuh izin penilaian.',
    )
    expect(wrapper.findComponent(ActionCell).props('viewLabel')).toBe('Lihat')
    expect(
      wrapper.get('[data-test="grade-dialog"]').attributes('data-can-grade'),
    ).toBe('false')
    wrapper.unmount()
  })

  it('shows the participant number and the name, not the nis', async () => {
    permissions.add('exam-grading.read')
    permissions.add('exam-grading.read-all')
    const wrapper = mount(GradingDetailView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('No. Peserta')
    expect(wrapper.text()).toContain('26-0001')
    expect(wrapper.text()).toContain('Nama Siswa')
    expect(wrapper.text()).not.toContain('1001')
    wrapper.unmount()
  })

  it('enables Nilai label and grading dialog when exam-grading.grade is granted', async () => {
    permissions.add('exam-grading.read')
    permissions.add('exam-grading.grade')
    const wrapper = mount(GradingDetailView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).not.toContain(
      'Anda hanya bisa melihat jawaban; menilai butuh izin penilaian.',
    )
    expect(wrapper.findComponent(ActionCell).props('viewLabel')).toBe('Nilai')
    expect(
      wrapper.get('[data-test="grade-dialog"]').attributes('data-can-grade'),
    ).toBe('true')
    wrapper.unmount()
  })
})
