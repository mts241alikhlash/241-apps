// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, reactive, ref } from 'vue'
import GradingSheetView from './GradingSheetView.vue'

const { loadEvents, loadSchedules, loadPeople, push } = vi.hoisted(() => ({
  loadEvents: vi.fn(),
  loadSchedules: vi.fn(),
  loadPeople: vi.fn(),
  push: vi.fn(),
}))

const routeState = reactive<{ params: Record<string, string> }>({
  params: {},
})
const routeCategory = ref<'EXAM' | 'NON_EXAM'>('EXAM')

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ push }),
}))
vi.mock('@mts241alikhlash/web-shared/composables/useBreadcrumbs', () => ({
  useBreadcrumbs: vi.fn(),
}))
vi.mock('@/features/exam-shared/usePackageSubjects', () => ({
  usePackageSubjects: () => ({
    subjectOf: (_id: string, title: string) => title,
  }),
}))
vi.mock('@/features/exam-shared/useRouteCategory', () => ({
  useRouteCategory: () => ({
    category: computed(() => routeCategory.value),
  }),
}))
vi.mock('@/features/lookup/semester', () => ({
  AcademicPeriodFilter: { template: '<div />' },
}))
vi.mock('@/features/exam-event/services/examEventService', () => ({
  examEventService: { loadEvents },
}))
vi.mock('../services/gradingSheetService', () => ({
  gradingSheetService: { loadSchedules, loadPeople },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const DataTableEmptyStub = defineComponent({
  props: {
    message: { type: String, required: true },
  },
  template: '<div data-testid="empty">{{ message }}</div>',
})
const DataTableStub = defineComponent({
  props: {
    data: { type: Array, required: true },
  },
  template:
    '<div><div v-if="data.length === 0"><slot name="empty" /></div><div v-else data-testid="rows">{{ data.length }}</div></div>',
})

const stubs = {
  Badge: passthrough,
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  CardFooter: passthrough,
  Button: passthrough,
  BackButton: passthrough,
  SearchInput: passthrough,
  DataTableEmpty: DataTableEmptyStub,
  FloatingLabelField: passthrough,
  Select: passthrough,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  Dialog: passthrough,
  DialogBody: passthrough,
  DialogContent: passthrough,
  DialogDescription: passthrough,
  DialogFooter: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  GradingSheet: passthrough,
  DataTable: DataTableStub,
}

beforeEach(() => {
  vi.clearAllMocks()
  routeCategory.value = 'EXAM'
  for (const key of Object.keys(routeState.params)) {
    delete routeState.params[key]
  }
  loadEvents.mockResolvedValue({
    success: true,
    data: [
      {
        id: 'e1',
        name: 'ASAS',
        type: 'FINAL',
        status: 'ACTIVE',
        semesterId: 'sem-1',
        startsAt: '2026-11-23T00:00:00.000Z',
        endsAt: '2026-12-05T00:00:00.000Z',
      },
    ],
  })
  loadSchedules.mockResolvedValue([
    {
      id: 'sch-1',
      packageId: 'pkg-1',
      title: 'Akidah Akhlak',
      classroomId: 'cls-1',
      classroomName: 'IX-A',
      startsAt: '2026-11-24T00:00:00.000Z',
      endsAt: '2026-11-24T01:15:00.000Z',
      kind: 'REGULAR',
      sessions: 10,
      awaitingGrading: 4,
    },
  ])
  loadPeople.mockResolvedValue([])
})

describe('GradingSheetView', () => {
  it('shows exam event periods at level 1 before loading exam schedules', async () => {
    const wrapper = mount(GradingSheetView, { global: { stubs } })
    await flushPromises()
    expect(loadEvents).toHaveBeenCalled()
    expect(loadSchedules).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="rows"]').text()).toBe('1')
  })

  it('shows exam days when an exam event is selected', async () => {
    routeState.params.eventId = 'e1'
    const wrapper = mount(GradingSheetView, { global: { stubs } })
    await flushPromises()
    expect(loadSchedules).toHaveBeenCalledWith('EXAM', '')
    expect(wrapper.find('[data-testid="rows"]').text()).toBe('1')
  })

  it('shows classwork days directly without loading events', async () => {
    routeCategory.value = 'NON_EXAM'
    const wrapper = mount(GradingSheetView, { global: { stubs } })
    await flushPromises()
    expect(loadEvents).not.toHaveBeenCalled()
    expect(loadSchedules).toHaveBeenCalledWith('NON_EXAM', '')
    expect(wrapper.find('[data-testid="rows"]').text()).toBe('1')
  })

  it('shows class-specific empty message when an active class has no finished students', async () => {
    routeState.params.eventId = 'e1'
    routeState.params.dayId = '2026-11-24'
    routeState.params.subjectId =
      '2026-11-24T00:00:00.000Z-2026-11-24T01:15:00.000Z-akidah-akhlak'
    routeState.params.classId = 'sch-1'
    const wrapper = mount(GradingSheetView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="empty"]').text()).toBe(
      'Belum ada siswa yang mengumpulkan ujian pada kelas ini.',
    )
  })
})
