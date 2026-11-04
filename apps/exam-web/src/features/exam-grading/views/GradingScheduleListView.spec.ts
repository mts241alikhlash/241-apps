// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import GradingScheduleListView from './GradingScheduleListView.vue'
import type { GradingSchedule } from '../types'
import { rowActionProps } from '@/test/dataTableCards'

const { refresh, permissions, push } = vi.hoisted(() => ({
  refresh: vi.fn(),
  permissions: new Set<string>(),
  push: vi.fn(),
}))
const listState = {
  schedules: ref<GradingSchedule[]>([]),
  totalItems: ref(0),
  loading: ref(false),
  listError: ref<string | null>(null),
}

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/features/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: (code: string) => permissions.has(code),
  }),
}))
vi.mock('../composables/useGradingLists', () => ({
  useGradingSchedules: () => ({ ...listState, refresh }),
}))
vi.mock('@/features/exam-schedule/components/MakeupDialog.vue', () => ({
  default: defineComponent({
    name: 'MakeupDialogStub',
    props: { open: Boolean, schedule: Object },
    emits: ['update:open', 'created'],
    template:
      '<div data-test="makeup-dialog" :data-package="schedule.packageId" :data-duration="schedule.durationMinutes" :data-title="schedule.packageTitle"><button data-test="made" @click="$emit(\'created\', \'m9\')" /></div>',
  }),
}))
vi.mock(
  '@/features/exam-schedule/components/MakeupParticipantsDialog.vue',
  () => ({
    default: defineComponent({
      name: 'MakeupParticipantsDialogStub',
      props: { open: Boolean, scheduleId: String, title: String },
      template:
        '<div data-test="participants-dialog" :data-schedule="scheduleId" />',
    }),
  }),
)

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  template: '<button :disabled="disabled"><slot /></button>',
})

const schedule = (
  overrides: Partial<GradingSchedule> = {},
): GradingSchedule => ({
  id: 's1',
  title: 'UTS Matematika',
  packageId: 'p1',
  durationMinutes: 90,
  kind: 'REGULAR',
  subjectId: 'sub',
  classroomId: 'c1',
  classroomName: 'VII A',
  semesterId: 'sem',
  type: 'UTS',
  startsAt: '2026-11-02T01:00:00.000Z',
  endsAt: '2026-11-02T04:00:00.000Z',
  sessions: 0,
  awaitingGrading: 0,
  graded: 0,
  ...overrides,
})

const stubs = {
  Button: button,
  Card: passthrough,
  Tooltip: passthrough,
  TooltipTrigger: passthrough,
  TooltipContent: passthrough,
}

type Host = Pick<VueWrapper, 'findAll' | 'find' | 'get' | 'findComponent'>

const labelsOf = (row: GradingSchedule, wrapper: Host) =>
  (
    (rowActionProps(wrapper, row).items ?? []) as unknown as { label: string }[]
  ).map((item) => item.label)

describe('GradingScheduleListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissions.clear()
    permissions.add('exam-grading.read')
    permissions.add('exam-grading.grade')
    listState.schedules.value = [schedule()]
    listState.totalItems.value = 1
  })

  it('opens the makeup dialog for the exam of the row, with its package and duration, and refreshes after it is made', async () => {
    const wrapper = mount(GradingScheduleListView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-test="makeup-dialog"]').exists()).toBe(false)

    const items = rowActionProps(wrapper, schedule()).items as unknown as {
      label: string
      onClick: () => void
    }[]
    items.find((item) => item.label === 'Susulan')!.onClick()
    await flushPromises()

    const dialog = wrapper.get('[data-test="makeup-dialog"]')
    expect(dialog.attributes('data-package')).toBe('p1')
    expect(dialog.attributes('data-duration')).toBe('90')
    expect(dialog.attributes('data-title')).toBe('UTS Matematika')
    await wrapper.get('[data-test="made"]').trigger('click')
    expect(refresh).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('opens the participants of a makeup', async () => {
    const makeup = schedule({ id: 'm1', kind: 'MAKEUP' })
    listState.schedules.value = [makeup]
    const wrapper = mount(GradingScheduleListView, { global: { stubs } })
    await flushPromises()

    const items = rowActionProps(wrapper, makeup).items as unknown as {
      label: string
      onClick: () => void
    }[]
    items.find((item) => item.label === 'Peserta')!.onClick()
    await flushPromises()

    expect(
      wrapper
        .get('[data-test="participants-dialog"]')
        .attributes('data-schedule'),
    ).toBe('m1')
    wrapper.unmount()
  })

  it('offers neither action without the grading permissions', async () => {
    permissions.clear()
    const wrapper = mount(GradingScheduleListView, { global: { stubs } })
    await flushPromises()

    expect(labelsOf(schedule(), wrapper)).toEqual([])
    wrapper.unmount()
  })
})
