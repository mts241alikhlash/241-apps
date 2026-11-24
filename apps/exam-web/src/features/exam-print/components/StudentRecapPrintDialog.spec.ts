// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import type { GradingSchedule } from '@/features/exam-grading/types'
import type { SessionPerson } from '../services/gradingSheetService'
import StudentRecapPrintDialog from './StudentRecapPrintDialog.vue'

const { loadPeople } = vi.hoisted(() => ({
  loadPeople: vi.fn(),
}))

vi.mock('../services/gradingSheetService', () => ({
  gradingSheetService: { loadPeople },
}))

vi.mock('vue-sonner', () => ({
  toast: { error: vi.fn() },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const ButtonStub = defineComponent({
  props: { disabled: Boolean, variant: { type: String, default: '' } },
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})
const RadioGroupStub = defineComponent({
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template: '<div><slot /></div>',
})
const RadioGroupItemStub = defineComponent({
  props: {
    id: { type: String, default: '' },
    value: { type: String, default: '' },
  },
  template: '<input type="radio" :id="id" :value="value" />',
})
const SelectStub = defineComponent({
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template: '<div data-testid="select" :data-value="modelValue"><slot /></div>',
})
const CheckboxStub = defineComponent({
  props: { modelValue: { type: Boolean, default: false } },
  emits: ['update:modelValue'],
  template:
    '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', ($event.target).checked)" />',
})

const stubs = {
  Dialog: passthrough,
  DialogBody: passthrough,
  DialogContent: passthrough,
  DialogDescription: passthrough,
  DialogFooter: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  FloatingLabelField: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  SelectContent: passthrough,
  SelectItem: passthrough,
  Button: ButtonStub,
  RadioGroup: RadioGroupStub,
  RadioGroupItem: RadioGroupItemStub,
  Select: SelectStub,
  Checkbox: CheckboxStub,
}

const makeSchedule = (
  id: string,
  title: string,
  classroomName: string,
  sessions = 10,
): GradingSchedule => ({
  id,
  packageId: `pkg-${title}`,
  title,
  subjectId: `sub-${title}`,
  classroomId: `cls-${id}`,
  classroomName,
  semesterId: 'sem-1',
  type: 'MIDTERM',
  category: 'EXAM',
  startsAt: '2026-11-24T00:00:00.000Z',
  endsAt: '2026-11-24T01:15:00.000Z',
  kind: 'REGULAR',
  durationMinutes: 75,
  sessions,
  awaitingGrading: 0,
  graded: sessions,
})

const peopleSample: SessionPerson[] = [
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
  {
    sessionId: 'ses-2',
    studentId: 'stu-2',
    studentName: 'Budi',
    studentNis: '102',
    status: 'GRADED',
    submittedAt: '2026-11-24T01:00:00.000Z',
    rawScore: 80,
    maxScore: 100,
    awaitingGrading: false,
    violationCount: 0,
    publication: null,
    participantNumber: 'P-02',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  loadPeople.mockResolvedValue(peopleSample)
})

describe('StudentRecapPrintDialog', () => {
  it('filters schedules by subject and grade and emits selected confirm payload', async () => {
    const schedules = [
      makeSchedule('sch-1', 'Matematika', 'VII-A', 20),
      makeSchedule('sch-2', 'Matematika', 'VIII-A', 22),
      makeSchedule('sch-3', 'IPA', 'VII-A', 20),
    ]
    const wrapper = mount(StudentRecapPrintDialog, {
      props: {
        open: true,
        schedules,
        subjectOf: (schedule: GradingSchedule) => schedule.title,
      },
      global: { stubs },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('3 lembar rekap nilai kelas (62 siswa)')

    const selects = wrapper.findAllComponents(SelectStub)
    expect(selects.length).toBe(3)

    selects[0].vm.$emit('update:modelValue', 'Matematika')
    await flushPromises()
    expect(wrapper.text()).toContain('2 lembar rekap nilai kelas (42 siswa)')

    wrapper
      .findAllComponents(SelectStub)[1]
      .vm.$emit('update:modelValue', 'Kelas 8')
    await flushPromises()
    expect(wrapper.text()).toContain('1 lembar rekap nilai kelas (22 siswa)')

    const radioGroups = wrapper.findAllComponents(RadioGroupStub)
    radioGroups[0].vm.$emit('update:modelValue', 'detail')
    await flushPromises()
    expect(wrapper.text()).toContain('22 lembar detail soal & jawaban siswa')

    const printBtn = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Cetak'))!
    await printBtn.trigger('click')

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toEqual({
      docType: 'detail',
      schedules: [schedules[1]],
      studentIds: undefined,
    })
  })

  it('loads students for a single class and allows choosing specific students', async () => {
    const schedule = makeSchedule('sch-1', 'Matematika', 'VII-A', 2)
    const wrapper = mount(StudentRecapPrintDialog, {
      props: {
        open: true,
        schedules: [schedule],
        subjectOf: (item: GradingSchedule) => item.title,
      },
      global: { stubs },
    })
    await flushPromises()

    const radioGroups = wrapper.findAllComponents(RadioGroupStub)
    radioGroups[0].vm.$emit('update:modelValue', 'detail')
    await flushPromises()

    const studentScopeGroup = wrapper.findAllComponents(RadioGroupStub)[1]
    studentScopeGroup.vm.$emit('update:modelValue', 'selected')
    await flushPromises()

    expect(loadPeople).toHaveBeenCalledWith(schedule)
    expect(wrapper.text()).toContain('Ahmad')
    expect(wrapper.text()).toContain('Budi')

    const printBtn = () =>
      wrapper
        .findAll('button')
        .find((button) => button.text().includes('Cetak'))!
    expect(printBtn().attributes('disabled')).toBeDefined()

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[1].setValue(true)
    await flushPromises()

    expect(printBtn().attributes('disabled')).toBeUndefined()
    await printBtn().trigger('click')

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toEqual({
      docType: 'detail',
      schedules: [schedule],
      studentIds: ['stu-2'],
    })
  })

  it('reuses knownPeople without refetching when already loaded', async () => {
    const schedule = makeSchedule('sch-1', 'Matematika', 'VII-A', 2)
    const wrapper = mount(StudentRecapPrintDialog, {
      props: {
        open: true,
        schedules: [schedule],
        knownPeople: peopleSample,
        knownScheduleId: 'sch-1',
        subjectOf: (item: GradingSchedule) => item.title,
      },
      global: { stubs },
    })
    await flushPromises()

    wrapper
      .findAllComponents(RadioGroupStub)[0]
      .vm.$emit('update:modelValue', 'detail')
    await flushPromises()
    wrapper
      .findAllComponents(RadioGroupStub)[1]
      .vm.$emit('update:modelValue', 'selected')
    await flushPromises()

    expect(loadPeople).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('P-01')
    expect(wrapper.text()).toContain('Ahmad')
  })
})
