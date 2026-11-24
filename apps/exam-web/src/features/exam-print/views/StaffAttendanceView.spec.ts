// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, reactive } from 'vue'
import StaffAttendanceView from './StaffAttendanceView.vue'

const { loadEvents, loadPack, loadReports, push } = vi.hoisted(() => ({
  loadEvents: vi.fn(),
  loadPack: vi.fn(),
  loadReports: vi.fn(),
  push: vi.fn(),
}))

const routeState = reactive<{ params: Record<string, string> }>({
  params: {},
})

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ push }),
}))
vi.mock('@mts241alikhlash/web-shared/composables/useBreadcrumbs', () => ({
  useBreadcrumbs: vi.fn(),
}))
vi.mock('@/features/lookup/semester', () => ({
  AcademicPeriodFilter: { template: '<div />' },
}))
vi.mock('@/features/exam-event/services/examEventService', () => ({
  examEventService: { loadEvents },
}))
vi.mock('../services/examPrintService', () => ({
  examPrintService: { loadPack },
}))
vi.mock('@/features/exam-room/services/examRoomService', () => ({
  examRoomService: { loadReports },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
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
  ServiceUnavailable: passthrough,
  DataTableEmpty: passthrough,
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
  StaffAttendanceSheet: passthrough,
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
  loadPack.mockResolvedValue({
    success: true,
    data: {
      event: {
        id: 'e1',
        name: 'ASAS',
        startsAt: '2026-11-23T00:00:00.000Z',
        endsAt: '2026-12-05T00:00:00.000Z',
      },
      rooms: [
        {
          id: 'r1',
          code: 'R01',
          name: 'Ruang 1',
          building: null,
          technician: { name: 'Teknisi 1' },
          supervisors: [
            {
              startsAt: '2026-11-24T00:00:00.000Z',
              endsAt: '2026-11-24T01:15:00.000Z',
              name: 'Pengawas 1',
            },
          ],
          students: [],
        },
      ],
      warnings: [],
    },
  })
  loadReports.mockResolvedValue({ success: true, data: [] })
})

describe('StaffAttendanceView', () => {
  it('shows exam event periods at level 1 before loading print pack', async () => {
    const wrapper = mount(StaffAttendanceView, { global: { stubs } })
    await flushPromises()
    expect(loadEvents).toHaveBeenCalled()
    expect(loadPack).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="rows"]').text()).toBe('1')
  })

  it('shows supervisor days when an event is selected', async () => {
    routeState.params.eventId = 'e1'
    const wrapper = mount(StaffAttendanceView, { global: { stubs } })
    await flushPromises()
    expect(loadPack).toHaveBeenCalledWith('e1')
    expect(wrapper.find('[data-testid="rows"]').text()).toBe('1')
  })
})
