// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { ActionCell } from '@mts241alikhlash/ui'
import ActivityListView from './ActivityListView.vue'
import ActivityDetailView from './ActivityDetailView.vue'
import ActivityPolicyDialog from '../components/ActivityPolicyDialog.vue'
import type { ExamActivityDetail } from '../types'

const { list, get, updatePolicy, permissions, push, routeState } = vi.hoisted(
  () => ({
    list: vi.fn(),
    get: vi.fn(),
    updatePolicy: vi.fn(),
    permissions: new Set<string>(),
    push: vi.fn(),
    routeState: {
      meta: { category: 'NON_EXAM' },
      params: { id: 'act-1' },
      path: '/classwork/activities',
      query: {},
    },
  }),
)

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => routeState,
}))

vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: (code: string) => permissions.has(code),
  }),
}))

vi.mock('@/features/exam-event/services/examEventService', () => ({
  examEventService: {
    loadEvents: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}))

vi.mock('../api/examActivityApi', () => ({
  examActivityApi: {
    list,
    get,
    updatePolicy,
  },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean, type: String },
  template:
    '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
})

const stubs = {
  Button: button,
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  CardFooter: passthrough,
  Dialog: passthrough,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  DialogBody: passthrough,
  DialogFooter: passthrough,
  AlertDialog: defineComponent({
    props: { open: Boolean },
    template: '<div v-if="open" data-test="confirm-dialog"><slot /></div>',
  }),
  AlertDialogContent: passthrough,
  AlertDialogHeader: passthrough,
  AlertDialogTitle: passthrough,
  AlertDialogDescription: passthrough,
  AlertDialogFooter: passthrough,
  AlertDialogCancel: button,
  AlertDialogAction: button,
  Plus: true,
  Tooltip: passthrough,
  TooltipProvider: passthrough,
  TooltipTrigger: passthrough,
  TooltipContent: passthrough,
}

const sampleDetail = (
  overrides: Partial<ExamActivityDetail> = {},
): ExamActivityDetail => ({
  id: 'act-1',
  semesterId: 'sem-1',
  eventId: 'ev-1',
  gradeId: 'grade-7',
  subjectId: 'sub-1',
  subjectName: 'Matematika',
  gradeName: 'Kelas 7',
  packageId: 'pkg-1',
  type: 'MIDTERM',
  category: 'EXAM',
  status: 'SCHEDULED',
  tokenMode: 'ROTATING',
  tokenRotation: 1,
  durationMinutes: 90,
  startsAt: '2026-11-12T01:00:00.000Z',
  endsAt: '2026-11-12T03:00:00.000Z',
  policy: {
    violationLimit: 3,
    focusThresholdMs: 15000,
    heartbeatIntervalMs: 30000,
    gapRecordedMs: 60000,
    gapTokenMs: 300000,
    gapViolationFrom: 2,
    tokenSlotSeconds: 900,
    lateToleranceMinutes: 15,
    minSubmitMinutes: 0,
    shuffleQuestions: true,
    shuffleChoices: true,
    allowWeb: true,
  },
  schedules: [
    {
      scheduleId: 'sch-1',
      classroomId: 'cls-1',
      classroomName: 'VII A',
      startsAt: '2026-11-12T01:00:00.000Z',
      endsAt: '2026-11-12T03:00:00.000Z',
    },
  ],
  ...overrides,
})

describe('ActivityListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissions.clear()
    permissions.add('exam-schedules.manage')
    routeState.meta.category = 'NON_EXAM'
    routeState.path = '/classwork/activities'
    list.mockResolvedValue([
      sampleDetail({
        id: 'act-daily',
        type: 'DAILY',
        category: 'NON_EXAM',
      }),
    ])
  })

  it('marks an activity without a package and offers to attach one', async () => {
    list.mockResolvedValue([sampleDetail({ id: 'act-x', packageId: null })])
    const wrapper = mount(ActivityListView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Menunggu paket')
    const labels = (
      wrapper.findComponent(ActionCell).props('items') as { label: string }[]
    ).map((item) => item.label)
    expect(labels).toContain('Pasang Paket')
    wrapper.unmount()
  })

  it('calls examActivityApi.list({ category }) with route.meta.category and navigates to the section create route', async () => {
    const wrapper = mount(ActivityListView, { global: { stubs } })
    await flushPromises()

    expect(list).toHaveBeenCalledWith({ category: 'NON_EXAM' })
    expect(wrapper.text()).toContain('Ulangan Harian')

    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Tambah'))
    await createBtn!.trigger('click')
    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/classwork/activities/new' }),
    )
    wrapper.unmount()
  })

  it('hides create, attach, and status actions on EXAM for read-only and teacher callers', async () => {
    routeState.meta.category = 'EXAM'
    routeState.path = '/exam/activities'
    routeState.query = { periode: 'none' }
    list.mockResolvedValue([sampleDetail({ id: 'act-1', packageId: null })])

    permissions.clear()
    permissions.add('exam-events.read')
    const reader = mount(ActivityListView, { global: { stubs } })
    await flushPromises()
    expect(reader.text()).not.toContain('Tambah')
    expect(
      (
        reader.findComponent(ActionCell).props('items') as { label: string }[]
      ).map((item) => item.label),
    ).toEqual([])
    reader.unmount()

    permissions.clear()
    permissions.add('exam-schedules.manage')
    const teacher = mount(ActivityListView, { global: { stubs } })
    await flushPromises()
    expect(teacher.text()).not.toContain('Tambah')
    expect(
      (
        teacher.findComponent(ActionCell).props('items') as { label: string }[]
      ).map((item) => item.label),
    ).toEqual([])
    teacher.unmount()

    permissions.add('exam-events.manage')
    const coordinator = mount(ActivityListView, { global: { stubs } })
    await flushPromises()
    expect(coordinator.text()).toContain('Tambah')
    expect(
      (
        coordinator.findComponent(ActionCell).props('items') as {
          label: string
        }[]
      ).map((item) => item.label),
    ).toEqual(['Pasang Paket', 'Ubah Status'])
    coordinator.unmount()
    routeState.query = {}
  })
})

describe('ActivityDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissions.clear()
    permissions.add('exam-schedules.manage')
    routeState.meta.category = 'EXAM'
    routeState.params.id = 'act-1'
    routeState.path = '/exam/activities/act-1'
    get.mockResolvedValue(sampleDetail())
  })

  it('renders type, token mode and schedules per class, hiding the policy edit for regular teachers', async () => {
    const wrapper = mount(ActivityDetailView, { global: { stubs } })
    await flushPromises()

    expect(get).toHaveBeenCalledWith('act-1')
    expect(wrapper.text()).toContain('Matematika')
    expect(wrapper.text()).toContain('UTS')
    expect(wrapper.text()).toContain('Berputar')
    expect(wrapper.text()).toContain('VII A')
    expect(wrapper.text()).not.toContain('Ubah')
    expect(wrapper.text()).not.toContain('Ganti token')
    wrapper.unmount()
  })

  it('shows the policy edit in the policy card for manage-all and opens the dialog', async () => {
    permissions.add('exam-schedules.manage-all')
    const wrapper = mount(ActivityDetailView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Ganti token')
    expect(wrapper.findComponent(ActivityPolicyDialog).exists()).toBe(false)
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Ubah'))!
      .trigger('click')
    await flushPromises()

    expect(wrapper.findComponent(ActivityPolicyDialog).exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('ActivityPolicyDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays 409 error when updating policy on an ACTIVE activity', async () => {
    updatePolicy.mockRejectedValue({
      response: {
        status: 409,
        data: {
          code: 'CONFLICT',
          message: 'Kebijakan tidak dapat diubah saat kegiatan berlangsung.',
        },
      },
    })

    const wrapper = mount(ActivityPolicyDialog, {
      props: {
        open: true,
        activityId: 'act-1',
        policy: sampleDetail().policy,
      },
      global: { stubs },
    })

    await wrapper.get('form').trigger('submit')
    await new Promise((resolve) => setTimeout(resolve, 30))
    await flushPromises()

    expect(updatePolicy).toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Kebijakan tidak dapat diubah saat kegiatan berlangsung.',
    )
    wrapper.unmount()
  })
})
