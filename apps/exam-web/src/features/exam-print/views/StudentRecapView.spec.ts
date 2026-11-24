// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, reactive } from 'vue'
import StudentRecapView from './StudentRecapView.vue'

const { loadEvents, loadSchedules, loadPeople, loadSheet, push, printSpy } =
  vi.hoisted(() => ({
    loadEvents: vi.fn(),
    loadSchedules: vi.fn(),
    loadPeople: vi.fn(),
    loadSheet: vi.fn(),
    push: vi.fn(),
    printSpy: vi.fn(),
  }))

const routeState = reactive<{ params: Record<string, string> }>({
  params: {},
})

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ push }),
}))
vi.mock('vue-sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn() },
}))
vi.mock('@mts241alikhlash/web-shared/composables/useBreadcrumbs', () => ({
  useBreadcrumbs: vi.fn(),
}))
vi.mock('@/features/exam-shared/usePackageSubjects', () => ({
  usePackageSubjects: () => ({
    ready: computed(() => true),
    subjectOf: (_id: string, title: string) => title,
  }),
}))
vi.mock('@/features/lookup/semester', () => ({
  AcademicPeriodFilter: { template: '<div />' },
}))
vi.mock('@/features/exam-event/services/examEventService', () => ({
  examEventService: { loadEvents },
}))
vi.mock('../services/gradingSheetService', () => ({
  gradingSheetService: { loadSchedules, loadPeople, loadSheet },
}))
vi.mock('../printImages', () => ({
  waitForPrintImages: vi.fn().mockResolvedValue(undefined),
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const ButtonStub = defineComponent({
  props: { disabled: Boolean },
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})
const DataTableStub = defineComponent({
  props: { data: { type: Array, required: true } },
  emits: ['rowClick'],
  template:
    '<div><slot name="filters" /><div v-if="data.length === 0"><slot name="empty" /></div><div v-else data-testid="rows" @click="$emit(\'rowClick\', data[0])">{{ data.length }}</div></div>',
})
const StudentScoreRecapStub = defineComponent({
  props: {
    subject: { type: String, default: '' },
    classroom: { type: String, default: '' },
    teacher: { type: String, default: '' },
    students: { type: Array, default: () => [] },
  },
  template:
    '<div data-testid="score-recap">{{ subject }}|{{ classroom }}|{{ teacher }}|{{ students.length }}</div>',
})
const StudentRecapStub = defineComponent({
  props: {
    subject: { type: String, default: '' },
    classroom: { type: String, default: '' },
    students: { type: Array, default: () => [] },
  },
  template:
    '<div data-testid="detail-recap">{{ subject }}|{{ classroom }}|{{ students.length }}</div>',
})
const PrintDialogStub = defineComponent({
  props: {
    open: Boolean,
    schedules: { type: Array, default: () => [] },
  },
  emits: ['update:open', 'confirm'],
  template:
    '<div v-if="open" data-testid="print-dialog"><button data-testid="confirm-score" @click="$emit(\'confirm\', { docType: \'score\', schedules })" /><button data-testid="confirm-detail" @click="$emit(\'confirm\', { docType: \'detail\', schedules })" /><button data-testid="confirm-subset" @click="$emit(\'confirm\', { docType: \'detail\', schedules, studentIds: [\'stu-1\'] })" /></div>',
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
  Button: ButtonStub,
  DataTable: DataTableStub,
  StudentScoreRecapSheet: StudentScoreRecapStub,
  StudentRecapSheet: StudentRecapStub,
  StudentRecapPrintDialog: PrintDialogStub,
}

const makeSchedule = (id: string, classroomName: string) => ({
  id,
  packageId: 'pkg-1',
  title: 'Matematika',
  subjectId: 'sub-1',
  classroomId: `cls-${id}`,
  classroomName,
  semesterId: 'sem-1',
  type: 'MIDTERM',
  category: 'EXAM',
  startsAt: '2026-11-24T00:00:00.000Z',
  endsAt: '2026-11-24T01:15:00.000Z',
  kind: 'REGULAR',
  durationMinutes: 75,
  sessions: 1,
  awaitingGrading: 0,
  graded: 1,
})

beforeEach(() => {
  vi.clearAllMocks()
  window.print = printSpy
  for (const key of Object.keys(routeState.params)) {
    delete routeState.params[key]
  }
  loadEvents.mockResolvedValue({
    success: true,
    data: [
      {
        id: 'e1',
        name: 'UTS Ganjil',
        type: 'MIDTERM',
        status: 'ACTIVE',
        semesterId: 'sem-1',
        startsAt: '2026-11-20T00:00:00.000Z',
        endsAt: '2026-11-30T23:59:59.000Z',
      },
    ],
  })
  loadSchedules.mockResolvedValue([
    makeSchedule('sch-1', 'VII-A'),
    makeSchedule('sch-2', 'VIII-A'),
  ])
  loadPeople.mockResolvedValue([
    {
      sessionId: 'ses-1',
      studentId: 'stu-1',
      studentName: 'Ahmad',
      studentNis: '101',
      status: 'GRADED',
      submittedAt: '2026-11-24T01:00:00.000Z',
      rawScore: 90,
      maxScore: 100,
      awaitingGrading: false,
      violationCount: 0,
      publication: null,
      participantNumber: 'P-01',
    },
  ])
  loadSheet.mockImplementation((schedule) =>
    Promise.resolve({
      schedule,
      subject: 'Matematika',
      teacher: 'Ust. Abdullah',
      students: [
        {
          key: 'ses-1',
          studentId: 'stu-1',
          name: 'Ahmad',
          participantNumber: 'P-01',
          rawScore: 90,
          maxScore: 100,
          items: [],
        },
      ],
    }),
  )
})

describe('StudentRecapView', () => {
  it('drills into subject when clicking an event row directly', async () => {
    const wrapper = mount(StudentRecapView, { global: { stubs } })
    await flushPromises()
    await wrapper.get('[data-testid="rows"]').trigger('click')
    expect(push).toHaveBeenCalledWith({
      name: 'ExamPrintStudentRecap',
      params: { eventId: 'e1' },
    })
  })

  it('prints class score recap sheets with teacher info for a subject', async () => {
    routeState.params.eventId = 'e1'
    routeState.params.subjectId = 'matematika'
    const wrapper = mount(StudentRecapView, { global: { stubs } })
    await flushPromises()

    let printed = ''
    let recapCount = 0
    printSpy.mockImplementation(() => {
      printed = wrapper.text()
      recapCount = wrapper.findAll('[data-testid="score-recap"]').length
    })

    const printBtn = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === 'Cetak')!
    await printBtn.trigger('click')
    await wrapper.get('[data-testid="confirm-score"]').trigger('click')
    await flushPromises()

    expect(loadSheet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sch-1' }),
      'Matematika',
      undefined,
      { manualOnly: false, includeTeacher: true },
    )
    expect(loadSheet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sch-2' }),
      'Matematika',
      undefined,
      { manualOnly: false, includeTeacher: true },
    )
    expect(recapCount).toBe(2)
    expect(printed).toContain('Matematika|VII-A|Ust. Abdullah|1')
    expect(printed).toContain('Matematika|VIII-A|Ust. Abdullah|1')
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('opens detail question recap preview when clicking a student row', async () => {
    routeState.params.eventId = 'e1'
    routeState.params.subjectId = 'matematika'
    routeState.params.classId = 'sch-1'
    const wrapper = mount(StudentRecapView, { global: { stubs } })
    await flushPromises()

    await wrapper.get('[data-testid="rows"]').trigger('click')
    await flushPromises()

    expect(loadSheet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sch-1' }),
      'Matematika',
      'stu-1',
      { manualOnly: false, includeTeacher: true },
    )
    expect(wrapper.get('[data-testid="detail-recap"]').text()).toBe(
      'Matematika|VII-A|1',
    )
  })

  it('prints detail recaps for all students in a class via the print dialog', async () => {
    routeState.params.eventId = 'e1'
    routeState.params.subjectId = 'matematika'
    routeState.params.classId = 'sch-1'
    const wrapper = mount(StudentRecapView, { global: { stubs } })
    await flushPromises()

    let detailCount = 0
    printSpy.mockImplementation(() => {
      detailCount = wrapper.findAll('[data-testid="detail-recap"]').length
    })

    const printBtn = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === 'Cetak')!
    await printBtn.trigger('click')
    await wrapper.get('[data-testid="confirm-detail"]').trigger('click')
    await flushPromises()

    expect(loadSheet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sch-1' }),
      'Matematika',
      undefined,
      { manualOnly: false, includeTeacher: true },
    )
    expect(detailCount).toBe(1)
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('filters loaded students when a subset of studentIds is confirmed', async () => {
    loadSheet.mockImplementation((schedule) =>
      Promise.resolve({
        schedule,
        subject: 'Matematika',
        teacher: 'Ust. Abdullah',
        students: [
          {
            key: 'ses-1',
            studentId: 'stu-1',
            name: 'Ahmad',
            participantNumber: 'P-01',
            items: [],
          },
          {
            key: 'ses-2',
            studentId: 'stu-2',
            name: 'Budi',
            participantNumber: 'P-02',
            items: [],
          },
          {
            key: 'ses-3',
            studentId: 'stu-3',
            name: 'Citra',
            participantNumber: 'P-03',
            items: [],
          },
        ],
      }),
    )

    routeState.params.eventId = 'e1'
    routeState.params.subjectId = 'matematika'
    routeState.params.classId = 'sch-1'
    const wrapper = mount(StudentRecapView, { global: { stubs } })
    await flushPromises()

    let rendered = ''
    printSpy.mockImplementation(() => {
      rendered = wrapper.get('[data-testid="detail-recap"]').text()
    })

    wrapper.findComponent(PrintDialogStub).vm.$emit('confirm', {
      docType: 'detail',
      schedules: [makeSchedule('sch-1', 'VII-A')],
      studentIds: ['stu-1', 'stu-3'],
    })
    await flushPromises()

    expect(loadSheet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sch-1' }),
      'Matematika',
      undefined,
      { manualOnly: false, includeTeacher: true },
    )
    expect(rendered).toBe('Matematika|VII-A|2')
    expect(printSpy).toHaveBeenCalledTimes(1)
  })
})
