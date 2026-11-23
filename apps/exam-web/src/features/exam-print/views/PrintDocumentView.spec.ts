// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import PrintDocumentView from './PrintDocumentView.vue'

const { loadEvents, loadLetterhead, loadPack, loadActivitySchedules } =
  vi.hoisted(() => ({
    loadEvents: vi.fn(),
    loadLetterhead: vi.fn(),
    loadPack: vi.fn(),
    loadActivitySchedules: vi.fn(),
  }))

vi.mock('@/features/exam-event/services/examEventService', () => ({
  examEventService: { loadEvents },
}))
vi.mock('@/features/exam-room/services/examRoomService', () => ({
  examRoomService: { loadLetterhead },
}))
vi.mock('../services/examPrintService', () => ({
  examPrintService: { loadPack, loadActivitySchedules },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const stubs = {
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  FloatingLabelField: passthrough,
  Select: passthrough,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  Button: passthrough,
  Tooltip: passthrough,
  TooltipProvider: passthrough,
  TooltipTrigger: passthrough,
  TooltipContent: passthrough,
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
  loadEvents.mockResolvedValue({
    success: true,
    data: [{ id: 'e1', name: 'UAS', status: 'ACTIVE' }],
  })
  loadLetterhead.mockResolvedValue({ name: 'MTs Persis 241' })
  loadPack.mockResolvedValue({ success: true, data: pack })
  loadActivitySchedules.mockResolvedValue({ success: true, data: [] })
})

const mountView = (doc: string) =>
  mount(PrintDocumentView, {
    props: { doc: doc as 'cards' },
    global: { stubs },
  })

describe('PrintDocumentView', () => {
  it('prints one section per room for the participant cards', async () => {
    const wrapper = mountView('cards')
    await flushPromises()
    expect(wrapper.findAll('.print-room')).toHaveLength(2)
    expect(wrapper.text()).toContain('P1')
    expect(wrapper.text()).toContain('1 siswa belum bernomor peserta')
  })

  it('loads schedules for the schedule document', async () => {
    loadActivitySchedules.mockResolvedValue({
      success: true,
      data: [
        {
          id: 's1',
          startsAt: '2026-11-23T01:00:00.000Z',
          endsAt: '2026-11-23T02:00:00.000Z',
          classroomName: '7A',
          packageTitle: 'Matematika',
        },
      ],
    })
    const wrapper = mountView('schedule')
    await flushPromises()
    expect(loadActivitySchedules).toHaveBeenCalledWith({
      id: 'e1',
      name: 'UAS',
      startsAt: '2026-11-23T00:00:00.000Z',
      endsAt: '2026-12-05T00:00:00.000Z',
    })
    expect(wrapper.text()).toContain('Matematika')
  })

  it('shows the load error and no document', async () => {
    loadPack.mockResolvedValue({ success: false, error: 'Gagal' })
    const wrapper = mountView('cards')
    await flushPromises()
    expect(wrapper.text()).toContain('Gagal')
    expect(wrapper.findAll('.print-room')).toHaveLength(0)
  })
})
