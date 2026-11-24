// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import GradingSheetView from './GradingSheetView.vue'
import type { GradingSchedule } from '@/features/exam-grading/types'

const { loadEvents, loadSchedules, toastError, push, routeState } = vi.hoisted(
  () => ({
    loadEvents: vi.fn(),
    loadSchedules: vi.fn(),
    toastError: vi.fn(),
    push: vi.fn(),
    routeState: {
      meta: { category: 'EXAM' },
      params: {},
    },
  }),
)

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => routeState,
}))
vi.mock('vue-sonner', () => ({
  toast: { error: toastError, info: vi.fn() },
}))
vi.mock('@mts241alikhlash/web-shared/composables/useBreadcrumbs', () => ({
  useBreadcrumbs: vi.fn(),
}))
vi.mock('@/features/exam-event/services/examEventService', () => ({
  examEventService: { loadEvents },
}))
vi.mock('@/features/exam-shared/usePackageSubjects', () => ({
  usePackageSubjects: () => ({
    subjectOf: (_id: string, title: string) => title,
  }),
}))
vi.mock('@/features/lookup/semester', () => ({
  AcademicPeriodFilter: defineComponent({
    name: 'AcademicPeriodFilterStub',
    template: '<div data-test="semester-filter" />',
  }),
}))
vi.mock('../services/gradingSheetService', () => ({
  gradingSheetService: {
    loadSchedules,
    loadPeople: vi.fn().mockResolvedValue([]),
    loadSheet: vi.fn(),
  },
}))
vi.mock('../printImages', () => ({
  waitForPrintImages: vi.fn().mockResolvedValue(undefined),
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { disabled: Boolean },
  template: '<button :disabled="disabled"><slot /></button>',
})

const stubs = {
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  CardFooter: passthrough,
  Button: button,
  BackButton: button,
  SearchInput: passthrough,
  FloatingLabelField: passthrough,
  Select: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  SelectContent: passthrough,
  SelectItem: passthrough,
  Dialog: passthrough,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  DialogBody: passthrough,
  DialogFooter: passthrough,
  GradingSheet: passthrough,
  Tooltip: passthrough,
  TooltipTrigger: passthrough,
  TooltipContent: passthrough,
  Printer: true,
}

const makeSchedule = (
  overrides: Partial<GradingSchedule> = {},
): GradingSchedule => ({
  id: 's1',
  title: 'Fiqih',
  packageId: 'p1',
  durationMinutes: 60,
  kind: 'REGULAR',
  subjectId: 'sub-1',
  classroomId: 'c1',
  classroomName: 'VII A',
  semesterId: 'sem-1',
  type: 'MIDTERM',
  category: 'EXAM',
  startsAt: '2026-11-23T01:00:00.000Z',
  endsAt: '2026-11-23T02:00:00.000Z',
  sessions: 12,
  awaitingGrading: 3,
  graded: 9,
  ...overrides,
})

describe('GradingSheetView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.meta = { category: 'EXAM' }
    routeState.params = {}
  })

  it('loads exam periods and schedules cleanly for teachers on EXAM grading sheet', async () => {
    loadEvents.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'ev-1',
          name: 'UTS Ganjil',
          status: 'ACTIVE',
          startsAt: '2026-11-20T00:00:00.000Z',
          endsAt: '2026-11-30T23:59:59.000Z',
        },
      ],
    })
    loadSchedules.mockResolvedValue([makeSchedule()])

    const wrapper = mount(GradingSheetView, { global: { stubs } })
    await flushPromises()

    expect(loadEvents).toHaveBeenCalledWith({ limit: 200 })
    expect(loadSchedules).toHaveBeenCalledWith('EXAM', '')
    expect(toastError).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-slot="data-table-cards"] li')).toHaveLength(1)
    wrapper.unmount()
  })

  it('skips loadEvents on NON_EXAM grading sheet and renders schedules directly', async () => {
    routeState.meta = { category: 'NON_EXAM' }
    loadSchedules.mockResolvedValue([
      makeSchedule({ id: 'cw-1', category: 'NON_EXAM', type: 'DAILY' }),
    ])

    const wrapper = mount(GradingSheetView, { global: { stubs } })
    await flushPromises()

    expect(loadEvents).not.toHaveBeenCalled()
    expect(loadSchedules).toHaveBeenCalledWith('NON_EXAM', '')
    expect(toastError).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-slot="data-table-cards"] li')).toHaveLength(1)
    wrapper.unmount()
  })
})
