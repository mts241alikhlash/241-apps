// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref, type Ref } from 'vue'
import ScheduleListView from './ScheduleListView.vue'
import type { ExamSchedule } from '../types'
import { toInstant } from '../utils/instant'
import { CARDS, cardRows, rowActionProps } from '@/test/dataTableCards'

const { filters, refresh, permissions, cancelSchedule } = vi.hoisted(() => ({
  filters: {} as Record<'classroomId' | 'status', Ref<string>> &
    Record<'page' | 'pageSize', Ref<number>>,
  refresh: vi.fn(),
  permissions: new Set<string>(),
  cancelSchedule: vi.fn(),
}))
const listState = {
  schedules: ref<ExamSchedule[]>([]),
  totalItems: ref(0),
  loading: ref(false),
  listError: ref<string | null>(null),
  filtersPending: ref(false),
}

vi.mock('@/features/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: (code: string) => permissions.has(code),
  }),
}))
vi.mock('../composables/useScheduleList', () => ({
  useScheduleList: (
    state: typeof filters,
    page: Ref<number>,
    pageSize: Ref<number>,
  ) => {
    Object.assign(filters, state, { page, pageSize })
    return { ...listState, refresh }
  },
}))
vi.mock('../services/examScheduleService', () => ({
  examScheduleService: { cancelSchedule },
}))
vi.mock('../components/ScheduleFormDialog.vue', () => ({
  default: defineComponent({
    name: 'ScheduleFormDialogStub',
    props: { open: Boolean, schedule: Object, packageId: String },
    template: '<div v-if="open" data-test="schedule-dialog" />',
  }),
}))

vi.mock('../components/AccessCodeDialog.vue', () => ({
  default: defineComponent({
    name: 'AccessCodeDialogStub',
    props: { open: Boolean, scheduleId: String, title: String },
    template: '<div data-test="access-dialog" :data-schedule="scheduleId" />',
  }),
}))

vi.mock('../components/MakeupDialog.vue', () => ({
  default: defineComponent({
    name: 'MakeupDialogStub',
    props: { open: Boolean, schedule: Object },
    emits: ['update:open', 'created'],
    template:
      '<div data-test="makeup-dialog" :data-schedule="schedule.id"><button data-test="made" @click="$emit(\'created\', \'m9\')" /></div>',
  }),
}))
vi.mock('../components/MakeupParticipantsDialog.vue', () => ({
  default: defineComponent({
    name: 'MakeupParticipantsDialogStub',
    props: { open: Boolean, scheduleId: String, title: String },
    template:
      '<div data-test="participants-dialog" :data-schedule="scheduleId" />',
  }),
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  template: '<button :disabled="disabled"><slot /></button>',
})
const select = defineComponent({
  name: 'SelectStub',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: '<div><slot /></div>',
})
const trigger = defineComponent({
  template: '<button type="button"><slot /></button>',
})
const item = defineComponent({
  props: { value: String },
  template: '<option :value="value"><slot /></option>',
})
const floatingField = defineComponent({
  props: { label: String, for: String, floating: Boolean },
  template: '<div><label :for="$props.for">{{ label }}</label><slot /></div>',
})
const alertDialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open" data-test="confirm"><slot /></div>',
})

const stubs = {
  Button: button,
  Card: passthrough,
  Tooltip: passthrough,
  TooltipTrigger: passthrough,
  TooltipContent: passthrough,
  FloatingLabelField: floatingField,
  Select: select,
  SelectContent: passthrough,
  SelectItem: item,
  SelectTrigger: trigger,
  SelectValue: passthrough,
  AlertDialog: alertDialog,
  AlertDialogContent: passthrough,
  AlertDialogHeader: passthrough,
  AlertDialogFooter: passthrough,
  AlertDialogTitle: passthrough,
  AlertDialogDescription: passthrough,
  AlertDialogCancel: button,
  AlertDialogAction: button,
  Plus: true,
}

const schedule = (overrides: Partial<ExamSchedule> = {}): ExamSchedule => ({
  id: 's1',
  packageId: 'p1',
  packageTitle: 'UTS Matematika',
  classroomId: 'c1',
  classroomName: 'VII A',
  semesterId: 'sem',
  eventId: null,
  type: 'UTS',
  startsAt: toInstant('2030-11-02', '08:00'),
  endsAt: toInstant('2030-11-02', '11:00'),
  durationMinutes: 90,
  status: 'SCHEDULED',
  kind: 'REGULAR' as const,
  makeupOfId: null,
  hasSessions: false,
  createdById: 'u1',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
  ...overrides,
})

describe('ScheduleListView', () => {
  beforeEach(() => {
    permissions.clear()
    ;['read', 'create', 'update', 'cancel', 'access-code'].forEach((action) =>
      permissions.add(`exam-schedules.${action}`),
    )
    permissions.add('exam-grading.read')
    permissions.add('exam-grading.grade')
    listState.schedules.value = [schedule()]
    listState.totalItems.value = 1
    listState.loading.value = false
    listState.listError.value = null
    listState.filtersPending.value = false
    vi.clearAllMocks()
  })

  it('lists schedules with package, classroom, window, duration and phase', async () => {
    const wrapper = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()

    const text = wrapper.get(CARDS).text()
    expect(cardRows(wrapper)).toHaveLength(1)
    expect(text).toContain('UTS Matematika')
    expect(text).toContain('VII A')
    expect(text).toContain('2 November 2030')
    expect(text).toContain('90 menit')
    expect(text).toContain('Belum mulai')
    wrapper.unmount()
  })

  it('opens the schedule dialog from Tambah only with exam-schedules.create', async () => {
    const wrapper = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-test="schedule-dialog"]').exists()).toBe(false)

    await wrapper
      .findAll('button')
      .find((candidate) => candidate.text().includes('Tambah'))!
      .trigger('click')

    expect(wrapper.find('[data-test="schedule-dialog"]').exists()).toBe(true)
    wrapper.unmount()

    permissions.delete('exam-schedules.create')
    const without = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()
    expect(without.text()).not.toContain('Tambah')
    without.unmount()
  })

  it('opens the dialog for the schedule when Ubah is chosen', async () => {
    const wrapper = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()

    const props = rowActionProps(wrapper, schedule())
    props.onEdit()
    await flushPromises()

    expect(wrapper.find('[data-test="schedule-dialog"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('asks for confirmation before cancelling and refreshes the list afterwards', async () => {
    cancelSchedule.mockResolvedValue(true)
    const wrapper = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()

    const items = rowActionProps(wrapper, schedule()).items as unknown as {
      label: string
      onClick: () => void
    }[]
    items.find((entry) => entry.label === 'Batalkan')!.onClick()
    await flushPromises()
    expect(wrapper.find('[data-test="confirm"]').exists()).toBe(true)
    expect(cancelSchedule).not.toHaveBeenCalled()

    await wrapper
      .findAll('button')
      .find((candidate) => candidate.text() === 'Ya, batalkan')!
      .trigger('click')
    await flushPromises()

    expect(cancelSchedule).toHaveBeenCalledWith('s1')
    expect(refresh).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('offers no actions on a cancelled schedule', async () => {
    const wrapper = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()

    const props = rowActionProps(wrapper, schedule({ status: 'CANCELLED' }))

    expect(props.hideEdit).toBe(true)
    expect(props.items).toEqual([])
    wrapper.unmount()
  })

  it('shows the empty state, and a reset button when a filter matches nothing', async () => {
    listState.schedules.value = []
    listState.totalItems.value = 0
    const wrapper = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('Belum ada jadwal ujian.')

    filters.status.value = 'CANCELLED'
    await flushPromises()
    expect(wrapper.text()).toContain(
      'Tidak ada jadwal yang cocok dengan filter.',
    )
    expect(wrapper.text()).toContain('Atur Ulang')
    wrapper.unmount()
  })

  it('shows the service error, such as the academic service being down, with a retry', async () => {
    listState.listError.value = 'Layanan akademik tidak dapat dihubungi.'
    const wrapper = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Layanan akademik tidak dapat dihubungi.')
    await wrapper
      .findAll('button')
      .find((candidate) => candidate.text() === 'Coba lagi')!
      .trigger('click')
    expect(refresh).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('opens the access code dialog for the schedule when Token is chosen', async () => {
    const wrapper = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-test="access-dialog"]').exists()).toBe(false)

    const items = rowActionProps(wrapper, schedule()).items as unknown as {
      label: string
      onClick: () => void
    }[]
    items.find((entry) => entry.label === 'Token')!.onClick()
    await flushPromises()

    expect(
      wrapper.get('[data-test="access-dialog"]').attributes('data-schedule'),
    ).toBe('s1')
    wrapper.unmount()
  })

  it('offers no Token action without exam-schedules.access-code', async () => {
    permissions.delete('exam-schedules.access-code')
    const wrapper = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()

    const items = rowActionProps(wrapper, schedule()).items as unknown as {
      label: string
    }[]
    expect(items.map((entry) => entry.label)).toEqual(['Batalkan', 'Susulan'])
    wrapper.unmount()
  })

  it('offers the status filter on a phone too', async () => {
    const wrapper = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()

    expect(
      wrapper
        .findAll('button')
        .some((candidate) => candidate.text().includes('Filter')),
    ).toBe(true)
    wrapper.unmount()
  })

  it('opens the makeup dialog for the schedule when Susulan is chosen, and refreshes after it is made', async () => {
    const wrapper = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-test="makeup-dialog"]').exists()).toBe(false)

    const items = rowActionProps(wrapper, schedule()).items as unknown as {
      label: string
      onClick: () => void
    }[]
    items.find((entry) => entry.label === 'Susulan')!.onClick()
    await flushPromises()

    expect(
      wrapper.get('[data-test="makeup-dialog"]').attributes('data-schedule'),
    ).toBe('s1')
    await wrapper.get('[data-test="made"]').trigger('click')
    expect(refresh).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('offers no Susulan action without exam-grading.grade', async () => {
    permissions.delete('exam-grading.grade')
    const wrapper = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()

    const items = rowActionProps(wrapper, schedule()).items as unknown as {
      label: string
    }[]

    expect(items.map((entry) => entry.label)).not.toContain('Susulan')
    wrapper.unmount()
  })

  it('opens the participants of a makeup when Peserta is chosen', async () => {
    const makeup = schedule({ id: 'm1', kind: 'MAKEUP', makeupOfId: 's1' })
    listState.schedules.value = [makeup]
    const wrapper = mount(ScheduleListView, { global: { stubs } })
    await flushPromises()

    const items = rowActionProps(wrapper, makeup).items as unknown as {
      label: string
      onClick: () => void
    }[]
    items.find((entry) => entry.label === 'Peserta')!.onClick()
    await flushPromises()

    expect(
      wrapper
        .get('[data-test="participants-dialog"]')
        .attributes('data-schedule'),
    ).toBe('m1')
    wrapper.unmount()
  })
})
