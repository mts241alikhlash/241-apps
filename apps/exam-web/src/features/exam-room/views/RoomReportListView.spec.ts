// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { ActionCell } from '@mts241alikhlash/ui'
import RoomReportListView from './RoomReportListView.vue'
import type { RoomReportSummary } from '../types'

const { loadEvents, loadReports, permissions, routeState, push } = vi.hoisted(
  () => {
    const params: Record<string, string> = {}
    return {
      loadEvents: vi.fn(),
      loadReports: vi.fn(),
      permissions: new Set<string>(),
      routeState: { params },
      push: vi.fn(),
    }
  },
)

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ push }),
}))

vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: (code: string) => permissions.has(code),
  }),
}))

vi.mock('@mts241alikhlash/web-shared/composables/useBreadcrumbs', () => ({
  useBreadcrumbs: () => undefined,
}))

vi.mock('../../exam-event/services/examEventService', () => ({
  examEventService: { loadEvents },
}))

vi.mock('../services/examRoomService', () => ({
  examRoomService: {
    loadReports,
    loadReport: vi.fn(),
    loadRoster: vi.fn(),
    submitReport: vi.fn(),
    replaceReportFile: vi.fn(),
    downloadReportFile: vi.fn(),
  },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  template: '<button :disabled="disabled"><slot /></button>',
})

const stubs = {
  BackButton: passthrough,
  Button: button,
  Card: passthrough,
  CardContent: passthrough,
  CardFooter: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  Dialog: passthrough,
  DialogBody: passthrough,
  DialogContent: passthrough,
  DialogDescription: passthrough,
  DialogFooter: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  FloatingLabelField: passthrough,
  Select: passthrough,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  SearchInput: passthrough,
  ReportFileDialog: passthrough,
  ReportSubmitDialogs: passthrough,
  RoomReportDocument: passthrough,
  Tooltip: passthrough,
  TooltipProvider: passthrough,
  TooltipTrigger: passthrough,
  TooltipContent: passthrough,
}

const sampleReport: RoomReportSummary = {
  roomId: 'r1',
  roomCode: 'R01',
  roomName: 'Ruang 01',
  slotId: 's1',
  startsAt: '2026-11-02T01:00:00.000Z',
  endsAt: '2026-11-02T02:00:00.000Z',
  status: 'DRAFT',
  registeredCount: 10,
  reportId: null,
  hasAttachment: false,
  attachmentName: null,
  subjectNames: ['Matematika'],
  supervisorName: 'Pengawas 1',
}

const itemLabels = (wrapper: ReturnType<typeof mount>) =>
  (wrapper.findComponent(ActionCell).props('items') as { label: string }[]).map(
    (item) => item.label,
  )

describe('RoomReportListView permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissions.clear()
    routeState.params = {}
    loadEvents.mockResolvedValue({
      success: true,
      data: [{ id: 'ev-1', name: 'UTS', status: 'ACTIVE' }],
    })
    loadReports.mockResolvedValue({
      success: true,
      data: [sampleReport],
    })
  })

  it('hides Serahkan for read-all and technician callers, and shows it for supervisor and manage-all', async () => {
    permissions.add('exam-rooms.read-all')
    const reader = mount(RoomReportListView, { global: { stubs } })
    await flushPromises()
    expect(itemLabels(reader)).toEqual(['Cetak'])
    reader.unmount()

    permissions.clear()
    permissions.add('exam-rooms.technician')
    const technician = mount(RoomReportListView, { global: { stubs } })
    await flushPromises()
    expect(itemLabels(technician)).toEqual(['Cetak'])
    technician.unmount()

    permissions.clear()
    permissions.add('exam-rooms.supervise')
    const supervisor = mount(RoomReportListView, { global: { stubs } })
    await flushPromises()
    expect(itemLabels(supervisor)).toEqual(['Cetak', 'Serahkan'])
    supervisor.unmount()

    permissions.clear()
    permissions.add('exam-rooms.manage-all')
    const manager = mount(RoomReportListView, { global: { stubs } })
    await flushPromises()
    expect(itemLabels(manager)).toEqual(['Cetak', 'Serahkan'])
    manager.unmount()
  })
})
