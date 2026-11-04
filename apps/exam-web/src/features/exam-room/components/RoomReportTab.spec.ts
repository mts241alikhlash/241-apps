// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import RoomReportTab from './RoomReportTab.vue'
import type { RoomReport } from '../types'

const { loadReport, saveReport, submitReport, verifyReport, push } = vi.hoisted(
  () => ({
    loadReport: vi.fn(),
    saveReport: vi.fn(),
    submitReport: vi.fn(),
    verifyReport: vi.fn(),
    push: vi.fn(),
  }),
)
vi.mock('../services/examRoomService', () => ({
  examRoomService: {
    loadReport,
    saveReport,
    submitReport,
    verifyReport,
  },
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const select = defineComponent({
  props: { modelValue: String, disabled: Boolean },
  template: '<div><slot /></div>',
})
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  emits: ['click'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})
const field = defineComponent({
  props: { label: String, for: String, floating: Boolean },
  template: '<div><label>{{ label }}</label><slot /></div>',
})
const textarea = defineComponent({
  props: { modelValue: String, id: String, disabled: Boolean },
  template: '<textarea :id="id" :value="modelValue" />',
})
const badge = defineComponent({
  props: { variant: String },
  template: '<span><slot /></span>',
})

const stubs = {
  Badge: badge,
  Button: button,
  FloatingLabelField: field,
  Select: select,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  Table: passthrough,
  TableBody: passthrough,
  TableCell: passthrough,
  TableHead: passthrough,
  TableHeader: passthrough,
  TableRow: passthrough,
  Textarea: textarea,
}

const report = (overrides: Partial<RoomReport> = {}): RoomReport => ({
  reportId: 'rep1',
  roomId: 'r1',
  slotId: 'slot1',
  status: 'DRAFT',
  condition: 'SMOOTH',
  incidentNotes: null,
  submittedAt: null,
  verifiedAt: null,
  slot: {
    startsAt: '2026-11-02T00:30:00.000Z',
    endsAt: '2026-11-02T02:00:00.000Z',
  },
  schedules: [
    {
      scheduleId: 's1',
      packageTitle: 'PAS Matematika',
      subjectName: 'Matematika',
      classroomName: 'VII A',
      startsAt: '2026-11-02T00:30:00.000Z',
      endsAt: '2026-11-02T02:00:00.000Z',
      registeredCount: 30,
      startedCount: 28,
      submittedCount: 26,
      absentCount: 2,
    },
  ],
  absences: [
    {
      id: 'a1',
      studentId: 'st1',
      studentName: 'Ani',
      nis: '001',
      scheduleId: 's1',
      reason: 'SICK',
      note: 'Demam tinggi',
      updatedAt: '2026-11-02T01:00:00.000Z',
    },
  ],
  fieldNotes: [],
  auditLogs: [
    {
      id: 'log1',
      sessionId: 'x1',
      action: 'RESET_SESSION',
      actorId: 'u1',
      reason: 'Layar mati',
      metadata: {},
      createdAt: '2026-11-02T01:10:00.000Z',
    },
  ],
  ...overrides,
})

const open = (props: Record<string, unknown> = {}) =>
  mount(RoomReportTab, {
    props: {
      roomId: 'r1',
      slotId: 'slot1',
      canVerify: false,
      canSubmit: true,
      ...props,
    },
    global: { stubs },
  })

const buttonByText = (host: ReturnType<typeof open>, text: string) =>
  host.findAll('button').find((candidate) => candidate.text() === text)

describe('RoomReportTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadReport.mockResolvedValue({ success: true, data: report() })
  })

  it('summarises the attendance and the absence reason of the slot', async () => {
    const wrapper = open()
    await flushPromises()

    expect(loadReport).toHaveBeenCalledWith('r1', 'slot1')
    expect(wrapper.text()).toContain('Hadir 28 dari 30')
    expect(wrapper.text()).toContain('Terkumpul 26')
    expect(wrapper.text()).toContain('Tidak hadir 2')
    expect(wrapper.text()).toContain('Demam tinggi')
    wrapper.unmount()
  })

  it('lists the technical actions taken during the exam window', async () => {
    const wrapper = open()
    await flushPromises()

    expect(wrapper.text()).toContain('Reset sesi')
    expect(wrapper.text()).toContain('Layar mati')
    wrapper.unmount()
  })

  it('lets the supervisor hand a draft in and locks the form after', async () => {
    submitReport.mockResolvedValue({
      success: true,
      data: report({ status: 'SUBMITTED' }),
    })
    const wrapper = open()
    await flushPromises()

    await buttonByText(wrapper, 'Serahkan Berita Acara')!.trigger('click')
    await flushPromises()

    expect(submitReport).toHaveBeenCalledWith('r1', 'slot1')
    expect(buttonByText(wrapper, 'Serahkan Berita Acara')).toBeUndefined()
    expect(buttonByText(wrapper, 'Simpan Draf')).toBeUndefined()
    wrapper.unmount()
  })

  it('offers verification and reopen to a coordinator only', async () => {
    loadReport.mockResolvedValue({
      success: true,
      data: report({ status: 'SUBMITTED' }),
    })
    const supervisor = open()
    await flushPromises()
    expect(buttonByText(supervisor, 'Verifikasi')).toBeUndefined()
    expect(buttonByText(supervisor, 'Buka Kembali')).toBeUndefined()
    supervisor.unmount()

    const coordinator = open({ canVerify: true })
    await flushPromises()
    expect(buttonByText(coordinator, 'Verifikasi')).toBeDefined()
    expect(buttonByText(coordinator, 'Buka Kembali')).toBeDefined()
    coordinator.unmount()
  })

  it('saves the draft with the chosen condition and notes', async () => {
    saveReport.mockResolvedValue({ success: true, data: report() })
    const wrapper = open()
    await flushPromises()

    await buttonByText(wrapper, 'Simpan Draf')!.trigger('click')
    await flushPromises()

    expect(saveReport).toHaveBeenCalledWith('r1', 'slot1', {
      condition: 'SMOOTH',
      incidentNotes: '',
    })
    wrapper.unmount()
  })

  it('hides the hand-in button from a caller who cannot submit', async () => {
    const wrapper = open({ canSubmit: false })
    await flushPromises()

    expect(buttonByText(wrapper, 'Serahkan Berita Acara')).toBeUndefined()
    wrapper.unmount()
  })

  it('opens the A4 print view of this slot', async () => {
    const wrapper = open()
    await flushPromises()

    await buttonByText(wrapper, 'Cetak Berita Acara & Daftar Hadir')!.trigger(
      'click',
    )

    expect(push).toHaveBeenCalledWith('/exam/rooms/r1/reports/slot1/print')
    wrapper.unmount()
  })

  it('shows the server refusal instead of the report', async () => {
    loadReport.mockResolvedValue({
      success: false,
      error: 'Berita acara shift lain tidak dapat dibuka.',
    })
    const wrapper = open()
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Berita acara shift lain tidak dapat dibuka.',
    )
    wrapper.unmount()
  })
})
