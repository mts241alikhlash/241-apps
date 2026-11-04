// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import RoomMonitorDetailView from './RoomMonitorDetailView.vue'

const { loadRoster, loadSupervisors, push } = vi.hoisted(() => ({
  loadRoster: vi.fn(),
  loadSupervisors: vi.fn(),
  push: vi.fn(),
}))

vi.mock('../services/examRoomService', () => ({
  examRoomService: { loadRoster, loadSupervisors },
  abilitiesFor: () => ({ supervise: true, recover: true }),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { roomId: 'r1' }, query: { slot: 'slot1' } }),
  useRouter: () => ({ push }),
}))

vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: () => true,
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
  template:
    '<div data-testid="tabs" @click="$emit(\'update:modelValue\', \'camera\')"><slot /></div>',
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
  RoomCameraGrid: defineComponent({
    props: { seats: Array, serverTime: String },
    template: '<div data-testid="camera-grid">{{ seats.length }}</div>',
  }),
  RoomMonitorSummaryCards: passthrough,
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
    lastSnapshotAt: null,
    cameraBlocked: null,
    latestSnapshotUrl: null,
  },
}

function mountView() {
  return mount(RoomMonitorDetailView, { global: { stubs } })
}

beforeEach(() => {
  loadRoster.mockReset()
  loadSupervisors.mockReset()
  loadSupervisors.mockResolvedValue([])
})

describe('RoomMonitorDetailView camera tab', () => {
  it('reports a failed roster fetch instead of an empty room', async () => {
    loadRoster.mockRejectedValueOnce(new Error('monitor-failed'))
    const wrapper = mountView()
    await flushPromises()
    await wrapper.find('[data-testid="tabs"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="camera-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(
      'Gagal memuat daftar siswa kamera pengawas.',
    )
  })

  it('reloads the seats from the retry button', async () => {
    loadRoster
      .mockRejectedValueOnce(new Error('monitor-failed'))
      .mockResolvedValueOnce({ data: [row], meta: null, total: 1 })
    const wrapper = mountView()
    await flushPromises()
    await wrapper.find('[data-testid="tabs"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="camera-retry"]').trigger('click')
    await flushPromises()

    expect(loadRoster).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="camera-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="camera-grid"]').text()).toBe('1')
  })
})
