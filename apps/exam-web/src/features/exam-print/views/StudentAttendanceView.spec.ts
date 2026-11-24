// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, reactive } from 'vue'
import StudentAttendanceView from './StudentAttendanceView.vue'

const {
  loadEvents,
  loadPack,
  loadActivitySchedules,
  loadGradeClassrooms,
  push,
} = vi.hoisted(() => ({
  loadEvents: vi.fn(),
  loadPack: vi.fn(),
  loadActivitySchedules: vi.fn(),
  loadGradeClassrooms: vi.fn(),
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
vi.mock('@/features/exam-shared/usePackageSubjects', () => ({
  usePackageSubjects: () => ({
    subjectOf: (_id: string, title: string) => title,
  }),
}))
vi.mock('@/features/lookup/semester', () => ({
  AcademicPeriodFilter: { template: '<div />' },
}))
vi.mock('@/features/exam-event/services/examEventService', () => ({
  examEventService: { loadEvents },
}))
vi.mock('../services/examPrintService', () => ({
  examPrintService: {
    loadPack,
    loadActivitySchedules,
    loadGradeClassrooms,
  },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const DataTableStub = defineComponent({
  props: {
    data: { type: Array, required: true },
  },
  template:
    '<div><slot name="header-right" /><div v-if="data.length === 0"><slot name="empty" /></div><div v-else data-testid="rows">{{ data.length }}</div></div>',
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
  DataTableEmpty: defineComponent({
    props: { message: { type: String, required: true } },
    template: '<div>{{ message }}</div>',
  }),
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
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  AttendanceSheet: passthrough,
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
          technician: null,
          supervisors: [],
          students: [
            {
              seatNumber: 1,
              studentId: 's1',
              name: 'Nafla',
              nis: '101',
              classroomName: 'IX-A',
              participantNumber: '001',
            },
          ],
        },
      ],
      warnings: [],
    },
  })
  loadActivitySchedules.mockResolvedValue({
    success: true,
    data: [
      {
        id: 'a1',
        activityId: 'a1',
        category: 'EXAM',
        classroomId: 'grade-9',
        classroomName: 'Kelas 9',
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
  loadGradeClassrooms.mockResolvedValue({
    success: true,
    data: new Map([
      ['grade-9', ['IX-A', 'IX-B']],
      ['Kelas 9', ['IX-A', 'IX-B']],
    ]),
  })
})

describe('StudentAttendanceView', () => {
  it('shows exam event periods at level 1 before loading print pack', async () => {
    const wrapper = mount(StudentAttendanceView, { global: { stubs } })
    await flushPromises()
    expect(loadEvents).toHaveBeenCalled()
    expect(loadPack).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="rows"]').text()).toBe('1')
  })

  it('shows exam days when an event is selected and maps grade activities to classrooms', async () => {
    routeState.params.eventId = 'e1'
    const wrapper = mount(StudentAttendanceView, { global: { stubs } })
    await flushPromises()
    expect(loadPack).toHaveBeenCalledWith('e1')
    expect(loadGradeClassrooms).toHaveBeenCalled()
    expect(wrapper.find('[data-testid="rows"]').text()).toBe('1')
  })

  it('stays at level 4 instead of redirecting when search yields no rooms', async () => {
    const start = new Date('2026-11-24T00:00:00.000Z').getTime()
    const end = new Date('2026-11-24T01:15:00.000Z').getTime()
    routeState.params.eventId = 'e1'
    routeState.params.dayId = '2026-11-24'
    routeState.params.subjectId = `${start}-${end}-akidah-akhlak`
    const wrapper = mount(StudentAttendanceView, {
      global: {
        stubs: {
          ...stubs,
          SearchInput: defineComponent({
            props: { modelValue: { type: String, required: true } },
            emits: ['update:modelValue'],
            template:
              '<input data-testid="search" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          }),
        },
      },
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="rows"]').text()).toBe('1')
    await wrapper.get('[data-testid="search"]').setValue('Ruang Tidak Ada')
    await flushPromises()
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(
      'Tidak ada daftar hadir yang cocok dengan pencarian.',
    )
  })
})
