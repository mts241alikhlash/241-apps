// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import ActivityListView from './ActivityListView.vue'
import ActivityDetailView from './ActivityDetailView.vue'
import ActivityPolicyDialog from '../components/ActivityPolicyDialog.vue'
import type { ExamActivityDetail } from '../types'

const { list, get, updatePolicy, rotateToken, permissions, push, routeState } =
  vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    updatePolicy: vi.fn(),
    rotateToken: vi.fn(),
    permissions: new Set<string>(),
    push: vi.fn(),
    routeState: {
      meta: { category: 'NON_EXAM' },
      params: { id: 'act-1' },
      path: '/classwork/activities',
    },
  }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => routeState,
}))

vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: (code: string) => permissions.has(code),
  }),
}))

vi.mock('../api/examActivityApi', () => ({
  examActivityApi: {
    list,
    get,
    updatePolicy,
    rotateToken,
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
}

const sampleDetail = (
  overrides: Partial<ExamActivityDetail> = {},
): ExamActivityDetail => ({
  id: 'act-1',
  semesterId: 'sem-1',
  eventId: 'ev-1',
  gradeId: 'grade-7',
  subjectId: 'sub-1',
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

  it('calls examActivityApi.list({ category }) with route.meta.category and navigates to the section create route', async () => {
    const wrapper = mount(ActivityListView, { global: { stubs } })
    await flushPromises()

    expect(list).toHaveBeenCalledWith({ category: 'NON_EXAM' })
    expect(wrapper.text()).toContain('Ulangan Harian')

    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Buat kegiatan'))
    await createBtn!.trigger('click')
    expect(push).toHaveBeenCalledWith('/classwork/activities/new')
    wrapper.unmount()
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

  it('renders preset/type, token mode, and schedules per class, hiding manage-all buttons for regular teachers', async () => {
    const wrapper = mount(ActivityDetailView, { global: { stubs } })
    await flushPromises()

    expect(get).toHaveBeenCalledWith('act-1')
    expect(wrapper.text()).toContain('UTS')
    expect(wrapper.text()).toContain('Token berputar')
    expect(wrapper.text()).toContain('VII A')
    expect(wrapper.text()).not.toContain('Ubah kebijakan')
    expect(wrapper.text()).not.toContain('Ganti token')
    wrapper.unmount()
  })

  it('shows Ubah kebijakan and Ganti token for manage-all and requires confirmation before rotating token', async () => {
    permissions.add('exam-schedules.manage-all')
    rotateToken.mockResolvedValue(sampleDetail({ tokenRotation: 2 }))
    const wrapper = mount(ActivityDetailView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Ubah kebijakan')
    const rotateBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Ganti token'))
    expect(rotateBtn).toBeDefined()

    await rotateBtn!.trigger('click')
    await flushPromises()
    expect(rotateToken).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="confirm-dialog"]').exists()).toBe(true)

    const confirmBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Ya, ganti token'))
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(rotateToken).toHaveBeenCalledWith('act-1')
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
    await flushPromises()

    expect(updatePolicy).toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Kebijakan tidak dapat diubah saat kegiatan berlangsung.',
    )
    wrapper.unmount()
  })
})
