// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, reactive } from 'vue'
import PrintDocumentView from './PrintDocumentView.vue'

const { loadEvents, loadPack, resetCredentials, push, permissions } =
  vi.hoisted(() => ({
    loadEvents: vi.fn(),
    loadPack: vi.fn(),
    resetCredentials: vi.fn(),
    push: vi.fn(),
    permissions: new Set<string>(),
  }))

vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: (code: string) => permissions.has(code),
  }),
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
  examPrintService: { loadPack, resetCredentials },
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
  Button: passthrough,
  Dialog: passthrough,
  DialogBody: passthrough,
  DialogContent: passthrough,
  DialogDescription: passthrough,
  DialogFooter: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DataTable: DataTableStub,
}

const student = (n: number) => ({
  seatNumber: n,
  studentId: `s${n}`,
  name: `Siswa ${n}`,
  nis: `${n}`,
  classroomName: '7A',
  participantNumber: `P${n}`,
})

const room = (id: string, code: string, students: unknown[]) => ({
  id,
  code,
  name: `Ruang ${code}`,
  building: null,
  technician: { name: 'Teknisi' },
  supervisors: [
    {
      startsAt: '2026-11-23T01:00:00.000Z',
      endsAt: '2026-11-23T02:00:00.000Z',
      name: 'Pengawas',
    },
  ],
  students,
})

const pack = {
  event: {
    id: 'e1',
    name: 'UAS',
    startsAt: '2026-11-23T00:00:00.000Z',
    endsAt: '2026-12-05T00:00:00.000Z',
  },
  rooms: [
    room('r1', 'R1', [student(1), student(2)]),
    room('r2', 'R2', [student(1)]),
  ],
  warnings: ['1 siswa belum bernomor peserta'],
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const key of Object.keys(routeState.params)) {
    delete routeState.params[key]
  }
  permissions.clear()
  permissions.add('exam-events.manage')
  loadEvents.mockResolvedValue({
    success: true,
    data: [
      {
        id: 'e1',
        name: 'UAS',
        type: 'FINAL',
        status: 'ACTIVE',
        semesterId: 'sem-1',
        startsAt: '2026-11-23T00:00:00.000Z',
        endsAt: '2026-12-05T00:00:00.000Z',
      },
    ],
  })
  loadPack.mockResolvedValue({ success: true, data: pack })
})

const mountView = (doc: 'cards' | 'desks') =>
  mount(PrintDocumentView, {
    props: { doc },
    global: { stubs },
  })

describe('PrintDocumentView', () => {
  it('shows exam event periods at level 1 before loading print pack', async () => {
    const wrapper = mountView('cards')
    await flushPromises()
    expect(loadEvents).toHaveBeenCalled()
    expect(loadPack).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="rows"]').text()).toBe('1')
    expect(wrapper.findAll('.print-room')).toHaveLength(0)
  })

  it('shows rooms and printable sheets when an event is selected', async () => {
    routeState.params.eventId = 'e1'
    const wrapper = mountView('cards')
    await flushPromises()
    expect(loadPack).toHaveBeenCalledWith('e1')
    expect(wrapper.find('[data-testid="rows"]').text()).toBe('2')
    expect(wrapper.findAll('.print-room')).toHaveLength(2)
    expect(wrapper.text()).toContain('P1')
    expect(wrapper.text()).toContain('1 siswa belum bernomor peserta')
  })

  it('scopes printable rooms and table to the selected room at level 3', async () => {
    routeState.params.eventId = 'e1'
    routeState.params.roomId = 'r1'
    const wrapper = mountView('desks')
    await flushPromises()
    expect(wrapper.findAll('.print-room')).toHaveLength(1)
    expect(wrapper.text()).toContain('P1')
    expect(wrapper.text()).toContain('P2')
  })

  it('shows the load error and no document when pack fails', async () => {
    routeState.params.eventId = 'e1'
    loadPack.mockResolvedValue({ success: false, error: 'Gagal' })
    const wrapper = mountView('cards')
    await flushPromises()
    expect(wrapper.text()).toContain('Gagal')
    expect(wrapper.findAll('.print-room')).toHaveLength(0)
  })

  it('hides Reset password on cards when user only holds exam-events.read', async () => {
    routeState.params.eventId = 'e1'
    permissions.clear()
    permissions.add('exam-events.read')
    const wrapper = mountView('cards')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Reset password')
    wrapper.unmount()

    permissions.add('exam-events.manage')
    const manager = mountView('cards')
    await flushPromises()
    expect(manager.text()).toContain('Reset password')
    manager.unmount()
  })
})
