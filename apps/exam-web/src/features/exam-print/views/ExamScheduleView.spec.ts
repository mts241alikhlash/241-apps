// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, reactive } from 'vue'
import ExamScheduleView from './ExamScheduleView.vue'

const { loadEvents, loadActivitySchedules, push, toastInfo, toastError } =
  vi.hoisted(() => ({
    loadEvents: vi.fn(),
    loadActivitySchedules: vi.fn(),
    push: vi.fn(),
    toastInfo: vi.fn(),
    toastError: vi.fn(),
  }))

const routeState = reactive<{ params: Record<string, string> }>({
  params: {},
})

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ push }),
}))
vi.mock('vue-sonner', () => ({
  toast: {
    info: toastInfo,
    error: toastError,
    loading: vi.fn(() => 'toast-id'),
    dismiss: vi.fn(),
  },
}))
vi.mock('@mts241alikhlash/web-shared/composables/useBreadcrumbs', () => ({
  useBreadcrumbs: vi.fn(),
}))
vi.mock('@/features/exam-shared/usePackageSubjects', () => ({
  usePackageSubjects: () => ({
    subjectOf: (_id: string, title: string) => title,
  }),
}))
vi.mock('@/features/exam-event/services/examEventService', () => ({
  examEventService: { loadEvents },
}))
vi.mock('../services/examPrintService', () => ({
  examPrintService: { loadActivitySchedules },
}))
vi.mock('../printImages', () => ({
  waitForPrintImages: vi.fn().mockResolvedValue(undefined),
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const buttonStub = defineComponent({
  props: { disabled: Boolean },
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})
const DataTableStub = defineComponent({
  props: {
    data: { type: Array, required: true },
    columns: { type: Array, required: true },
  },
  template:
    '<div><div v-if="data.length === 0"><slot name="empty" /></div><div v-else data-testid="rows">{{ data.length }}<button v-for="(row, index) in data" :key="index" type="button" class="row-print" @click="columns[columns.length - 1].cell({ row: { original: row } }).props.items[0].onClick()" /></div></div>',
})

const stubs = {
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  CardFooter: passthrough,
  Button: buttonStub,
  BackButton: passthrough,
  ServiceUnavailable: passthrough,
  DataTableEmpty: passthrough,
  Dialog: passthrough,
  DialogBody: passthrough,
  DialogContent: passthrough,
  DialogDescription: passthrough,
  DialogFooter: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  LetterheadKop: passthrough,
  DataTable: DataTableStub,
}

beforeEach(() => {
  vi.clearAllMocks()
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
  loadActivitySchedules.mockResolvedValue({
    success: true,
    data: [
      {
        id: 'a1',
        activityId: 'a1',
        category: 'EXAM',
        classroomId: 'g7',
        classroomName: 'VII',
        createdAt: '2026-11-24T00:00:00.000Z',
        createdById: '',
        durationMinutes: 75,
        endsAt: '2026-11-24T01:15:00.000Z',
        eventId: 'e1',
        hasSessions: false,
        kind: 'REGULAR',
        makeupOfId: null,
        minSubmitMinutes: 0,
        packageId: 'a1',
        packageTitle: 'Akidah Akhlak',
        semesterId: 'sem-1',
        startsAt: '2026-11-24T00:00:00.000Z',
        status: 'SCHEDULED',
        type: 'FINAL',
        updatedAt: '2026-11-24T00:00:00.000Z',
      },
    ],
  })
})

describe('ExamScheduleView', () => {
  it('shows exam event periods at level 1 before loading schedules', async () => {
    const wrapper = mount(ExamScheduleView, { global: { stubs } })
    await flushPromises()
    expect(loadEvents).toHaveBeenCalled()
    expect(loadActivitySchedules).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="rows"]').text()).toBe('1')
  })

  it('renders roman numeral grade columns and subjects when printing schedule', async () => {
    let printedText = ''
    routeState.params.eventId = 'e1'
    const wrapper = mount(ExamScheduleView, { global: { stubs } })
    Object.defineProperty(window, 'print', {
      value: () => {
        printedText = wrapper.text()
      },
      configurable: true,
    })
    await flushPromises()
    expect(loadActivitySchedules).toHaveBeenCalled()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(printedText).toContain('Kelas 7')
    expect(printedText).toContain('Akidah Akhlak')
  })

  it('shows info toast instead of error toast when event has no schedules to print', async () => {
    loadActivitySchedules.mockResolvedValue({ success: true, data: [] })
    const wrapper = mount(ExamScheduleView, { global: { stubs } })
    await flushPromises()
    await wrapper.get('.row-print').trigger('click')
    await flushPromises()
    expect(toastInfo).toHaveBeenCalledWith('Belum ada jadwal pada periode ini.')
    expect(toastError).not.toHaveBeenCalled()
  })
})
