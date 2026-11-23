// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import GradingScheduleListView from './GradingScheduleListView.vue'
import type { GradingSchedule } from '../types'

const { push, params } = vi.hoisted(() => ({
  push: vi.fn(),
  params: { value: {} },
}))

const schedule = (overrides: Partial<GradingSchedule>): GradingSchedule => ({
  id: 's1',
  title: 'Fiqih',
  packageId: 'p1',
  durationMinutes: 75,
  kind: 'REGULAR',
  subjectId: 'sub',
  classroomId: 'c1',
  classroomName: 'Kelas 7-A',
  semesterId: 'sem',
  type: 'FINAL',
  category: 'EXAM',
  startsAt: '2026-11-23T01:30:00.000Z',
  endsAt: '2026-11-23T02:45:00.000Z',
  sessions: 3,
  awaitingGrading: 1,
  graded: 2,
  ...overrides,
})

const all = [
  schedule({ id: 'a', title: 'Fiqih', classroomName: 'Kelas 9-A' }),
  schedule({ id: 'b', title: 'Fiqih', classroomName: 'Kelas 7-B' }),
  schedule({ id: 'c', title: 'Fiqih', classroomName: 'Kelas 8-A' }),
  schedule({ id: 'd', title: 'Fiqih', classroomName: 'Kelas 7-A' }),
  schedule({
    id: 'e',
    title: 'Bahasa Arab',
    classroomName: 'Kelas 7-A',
    startsAt: '2026-11-23T00:00:00.000Z',
    endsAt: '2026-11-23T01:15:00.000Z',
  }),
]

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ meta: { category: 'EXAM' }, params: params.value }),
}))
vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({ hasPermission: () => true }),
}))
vi.mock('../composables/useGradingLists', () => ({
  useGradingSchedules: () => ({
    schedules: ref([]),
    totalItems: ref(0),
    loading: ref(false),
    listError: ref(null),
    refresh: vi.fn(),
  }),
  useEventGradingSchedules: () => ({
    events: ref([
      {
        id: 'late',
        name: 'UAS',
        startsAt: '2026-11-30T00:00:00.000Z',
        endsAt: '2026-12-01T00:00:00.000Z',
      },
      {
        id: 'e1',
        name: 'UTS',
        startsAt: '2026-11-23T00:00:00.000Z',
        endsAt: '2026-11-24T00:00:00.000Z',
      },
    ]),
    eventId: ref('e1'),
    schedules: ref([]),
    totalItems: ref(0),
    loading: ref(false),
    listError: ref(null),
    refresh: vi.fn(),
    schedulesOf: (id: string) => (id === 'e1' ? all : []),
  }),
  compareClassroom: (left: string | null, right: string | null) =>
    (left ?? '').localeCompare(right ?? '', 'id', { numeric: true }),
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  template: '<button :disabled="disabled"><slot /></button>',
})
const stubs = {
  Button: button,
  Card: passthrough,
  Tooltip: passthrough,
  TooltipTrigger: passthrough,
  TooltipContent: passthrough,
}

const firstColumn = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('[data-slot="data-table-cards"] li').map((row) => row.text())

describe('GradingScheduleListView for Ujian', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    params.value = {}
  })

  it('starts with the list of exam periods, earliest first', async () => {
    const wrapper = mount(GradingScheduleListView, { global: { stubs } })
    await flushPromises()

    const rows = firstColumn(wrapper)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('UTS')
    expect(rows[1]).toContain('UAS')
    wrapper.unmount()
  })

  it('lists the subjects of the period by earliest time', async () => {
    params.value = { eventId: 'e1' }
    const wrapper = mount(GradingScheduleListView, { global: { stubs } })
    await flushPromises()

    const rows = firstColumn(wrapper)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('Bahasa Arab')
    expect(rows[1]).toContain('Fiqih')
    wrapper.unmount()
  })

  it('lists the classes of a subject from the lowest grade', async () => {
    params.value = {
      eventId: 'e1',
      subjectId: '2026-11-23T01:30:00.000Z-2026-11-23T02:45:00.000Z-fiqih',
    }
    const wrapper = mount(GradingScheduleListView, { global: { stubs } })
    await flushPromises()

    const rows = firstColumn(wrapper)
    expect(rows).toHaveLength(4)
    expect(rows.map((row) => /Kelas \d-[AB]/.exec(row)?.[0])).toEqual([
      'Kelas 7-A',
      'Kelas 7-B',
      'Kelas 8-A',
      'Kelas 9-A',
    ])
    wrapper.unmount()
  })
})
