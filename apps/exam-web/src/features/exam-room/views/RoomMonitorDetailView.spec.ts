// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import RoomMonitorDetailView from './RoomMonitorDetailView.vue'
import type * as ExamRoomServiceModule from '../services/examRoomService'

const {
  loadReport,
  loadRoster,
  loadSupervisors,
  push,
  permissions,
  routeState,
} = vi.hoisted(() => {
  const query: Record<string, string> = { slot: 'slot1' }
  return {
    loadReport: vi.fn(),
    loadRoster: vi.fn(),
    loadSupervisors: vi.fn(),
    push: vi.fn(),
    permissions: new Set<string>(),
    routeState: {
      params: { roomId: 'r1' },
      query,
    },
  }
})

vi.mock('../services/examRoomService', async (importOriginal) => {
  const actual = await importOriginal<typeof ExamRoomServiceModule>()
  return {
    ...actual,
    examRoomService: { loadReport, loadRoster, loadSupervisors },
  }
})

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ push }),
}))

vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: (code: string) => permissions.has(code),
    user: ref({ id: 'u1' }),
  }),
}))

vi.mock('@mts241alikhlash/web-shared/composables/useBreadcrumbs', () => ({
  useBreadcrumbs: () => undefined,
}))

const monitor = {
  participants: ref([]),
  summary: ref(null),
  page: ref(1),
  pageSize: ref(25),
  search: ref(''),
  status: ref('ALL'),
  totalItems: ref(0),
  loading: ref(false),
  room: ref(null),
  token: ref(null),
  lastUpdatedServerTime: ref(null),
  secondsSinceLastSuccess: ref(0),
  nowMs: ref(Date.now()),
  failed: ref(false),
  error: ref(null),
  staleness: ref('fresh'),
  refresh: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}

vi.mock('../composables/useRoomMonitor', () => ({
  useRoomMonitor: () => monitor,
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const tabs = defineComponent({
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: '<div data-testid="tabs"><slot /></div>',
})
const tabContent = defineComponent({
  props: { value: String },
  template: '<div><slot /></div>',
})
const button = defineComponent({
  props: { variant: String },
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
})
const dataTable = defineComponent({
  props: { data: Array, columns: Array, page: Number, pageSize: Number },
  template: '<div data-testid="table"><slot name="empty" /></div>',
})

const notesCard = defineComponent({
  name: 'RoomNotesCard',
  props: { slotId: String, canAdd: Boolean },
  template:
    '<div data-test="notes-card" :data-slot="slotId" :data-can-add="String(canAdd)" />',
})

const stubs = {
  BackButton: passthrough,
  Badge: passthrough,
  Button: button,
  Card: passthrough,
  CardContent: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  DataTable: dataTable,
  FloatingLabelField: passthrough,
  RoomMonitorSummaryCards: passthrough,
  RoomNotesCard: notesCard,
  RoomActionQueue: passthrough,
  RoomInfoCard: passthrough,
  RoomSessionCard: passthrough,
  RoomReportTab: passthrough,
  RecordAbsenceDialog: passthrough,
  RecordFieldNoteDialog: passthrough,
  SessionRecoveryDialog: passthrough,
  SessionTimelineDialog: passthrough,
  SearchInput: passthrough,
  Select: passthrough,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  Tabs: tabs,
  TabsContent: tabContent,
  TabsList: passthrough,
  TabsTrigger: passthrough,
}

const row = {
  studentId: 'stu1',
  studentName: 'Ahmad Fauzi',
  nis: '2024001',
  session: {
    sessionId: 's1',
  },
}

function mountView() {
  return mount(RoomMonitorDetailView, { global: { stubs } })
}

beforeEach(() => {
  permissions.clear()
  permissions.add('exam-rooms.manage-all')
  routeState.query = { slot: 'slot1' }
  loadRoster.mockReset()
  loadReport.mockReset()
  loadReport.mockResolvedValue({ success: false, error: 'tidak ada' })
  loadSupervisors.mockReset()
  loadSupervisors.mockResolvedValue([])
})

describe('RoomMonitorDetailView', () => {
  it('offers no camera tab', async () => {
    loadRoster.mockResolvedValue({ data: [row], meta: null, total: 1 })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Kamera Pengawas')
  })

  it('selects the active slot in read-only mode for exam-rooms.read-all without write controls', async () => {
    permissions.clear()
    permissions.add('exam-rooms.read-all')
    routeState.query = {}
    const now = Date.now()
    loadSupervisors.mockResolvedValue([
      {
        slotId: 'slot-active',
        scheduledUserId: 'sup-2',
        actualUserId: 'sup-2',
        startsAt: new Date(now - 10 * 60_000).toISOString(),
        endsAt: new Date(now + 50 * 60_000).toISOString(),
      },
    ])

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Anda tidak bertugas pada jam ini.')
    const notes = wrapper.get('[data-test="notes-card"]')
    expect(notes.attributes('data-slot')).toBe('slot-active')
    expect(notes.attributes('data-can-add')).toBe('false')
    wrapper.unmount()
  })
})
