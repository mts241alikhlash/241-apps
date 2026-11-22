// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const { loadCandidates, loadNumbers, issue, toastSuccess, toastError } =
  vi.hoisted(() => ({
    loadCandidates: vi.fn(),
    loadNumbers: vi.fn(),
    issue: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
  }))

vi.mock('@/features/exam-event/services/examEventService', () => ({
  examEventService: { loadCandidates },
}))
vi.mock('../services/participantNumberService', () => ({
  participantNumberService: { loadNumbers, issue },
}))
vi.mock('vue-sonner', () => ({
  toast: { success: toastSuccess, error: toastError },
}))
vi.mock('@/features/lookup/semester', () => ({
  AcademicPeriodFilter: defineComponent({
    emits: ['update:semesterId'],
    setup(_, { emit }) {
      emit('update:semesterId', 'sem1')
      return () => h('div')
    },
  }),
}))

import ParticipantNumberView from './ParticipantNumberView.vue'

const candidates = [
  {
    studentId: 's1',
    classroomId: 'c1',
    name: 'Ani',
    nis: '1001',
    nisn: null,
    classroomName: 'VII A',
    gradeName: 'VII',
    className: 'A',
  },
  {
    studentId: 's2',
    classroomId: 'c1',
    name: 'Budi',
    nis: '1002',
    nisn: null,
    classroomName: 'VII A',
    gradeName: 'VII',
    className: 'A',
  },
  {
    studentId: 's3',
    classroomId: 'c2',
    name: 'Citra',
    nis: '1003',
    nisn: null,
    classroomName: 'VIII B',
    gradeName: 'VIII',
    className: 'B',
  },
]

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { disabled: Boolean },
  emits: ['click'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})
const dataTable = defineComponent({
  props: { data: Array },
  template:
    '<div><slot name="filters" /><slot name="header-right" /><div v-for="row in data" :key="row.studentId" data-test="row">{{ row.name }} {{ row.number }}</div><slot name="empty" /></div>',
})
const stubs = {
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  CardFooter: passthrough,
  Badge: passthrough,
  Alert: passthrough,
  AlertTitle: passthrough,
  AlertDescription: passthrough,
  Button: button,
  DataTable: dataTable,
  SearchInput: defineComponent({
    props: { modelValue: String },
    emits: ['update:modelValue'],
    template:
      '<input data-test="search" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  }),
}

function mountView() {
  return mount(ParticipantNumberView, { global: { stubs } })
}

beforeEach(() => {
  vi.clearAllMocks()
  loadCandidates.mockResolvedValue(candidates)
  loadNumbers.mockResolvedValue(new Map([['s1', '001']]))
  issue.mockResolvedValue({ issued: 2, skipped: [] })
})

describe('ParticipantNumberView', () => {
  it('loads candidates and numbers for the selected semester and shows the counts', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(loadCandidates).toHaveBeenCalledWith('sem1')
    expect(loadNumbers).toHaveBeenCalledWith('sem1', ['s1', 's2', 's3'])
    const text = wrapper.text()
    expect(text).toMatch(/Terdaftar\s*3/)
    expect(text).toMatch(/Sudah bernomor\s*1/)
    expect(text).toMatch(/Belum bernomor\s*2/)
  })

  it('issues numbers then reloads the roster', async () => {
    const wrapper = mountView()
    await flushPromises()
    loadCandidates.mockClear()
    const issueButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Terbitkan nomor'))
    await issueButton!.trigger('click')
    await flushPromises()
    expect(issue).toHaveBeenCalledWith('sem1')
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('2'))
    expect(loadCandidates).toHaveBeenCalledWith('sem1')
  })

  it('lists the skipped students', async () => {
    issue.mockResolvedValue({ issued: 0, skipped: ['s3'] })
    const wrapper = mountView()
    await flushPromises()
    const issueButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Terbitkan nomor'))
    await issueButton!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Citra')
  })

  it('filters rows by name or NIS', async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('[data-test="search"]').setValue('budi')
    expect(wrapper.findAll('[data-test="row"]')).toHaveLength(1)
    await wrapper.get('[data-test="search"]').setValue('1003')
    expect(wrapper.findAll('[data-test="row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Citra')
  })
})
