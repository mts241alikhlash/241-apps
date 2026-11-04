// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import ScheduleFormDialog from './ScheduleFormDialog.vue'
import type { ExamSchedule } from '../types'
import { toInstant } from '../utils/instant'

const { loadPackages, loadClassrooms, loadEvents, saveSchedule } = vi.hoisted(
  () => ({
    loadPackages: vi.fn(),
    loadClassrooms: vi.fn(),
    loadEvents: vi.fn(),
    saveSchedule: vi.fn(),
  }),
)
vi.mock('../services/examScheduleService', () => ({
  examScheduleService: {
    loadPackages,
    loadClassrooms,
    loadEvents,
    saveSchedule,
  },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const dialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})
const button = defineComponent({
  props: { variant: String, disabled: Boolean, type: String },
  template: '<button :disabled="disabled" type="button"><slot /></button>',
})
const floatingField = defineComponent({
  props: { label: String, for: String, floating: Boolean, error: String },
  template: '<div><label :for="$props.for">{{ label }}</label><slot /></div>',
})
const select = defineComponent({
  name: 'SelectStub',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: '<div><slot /></div>',
})
const trigger = defineComponent({
  template: '<button type="button"><slot /></button>',
})
const item = defineComponent({
  props: { value: String },
  template: '<option :value="value"><slot /></option>',
})
const textInput = defineComponent({
  props: { modelValue: [String, Number], id: String, type: String },
  emits: ['update:modelValue'],
  template:
    '<input :id="id" :type="type" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const numberInput = defineComponent({
  props: { modelValue: [String, Number, null], id: String },
  emits: ['update:modelValue'],
  template:
    '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
})

const stubs = {
  Dialog: dialog,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  DialogBody: passthrough,
  DialogFooter: passthrough,
  Button: button,
  FloatingLabelField: floatingField,
  Select: select,
  SelectContent: passthrough,
  SelectItem: item,
  SelectTrigger: trigger,
  SelectValue: passthrough,
  DatePicker: textInput,
  Input: textInput,
  FormattedNumberInput: numberInput,
}

const events = [
  {
    id: 'e1',
    semesterId: 'sem',
    name: 'UTS Ganjil',
    type: 'UTS',
    startsAt: toInstant('2030-11-01', '08:00'),
    endsAt: toInstant('2030-11-06', '12:00'),
    lateToleranceMinutes: 30,
    minSubmitMinutes: 20,
    requireAndroidApp: true,
    status: 'ACTIVE',
  },
]

const packages = [
  {
    id: 'p1',
    title: 'UTS Matematika',
    subjectId: 'math',
    gradeId: 'g7',
    status: 'LOCKED',
  },
  {
    id: 'p2',
    title: 'UTS IPA',
    subjectId: 'ipa',
    gradeId: 'g8',
    status: 'DRAFT',
  },
]
const classrooms = [{ id: 'c1', displayName: 'VII A' }]

const existing: ExamSchedule = {
  id: 's1',
  packageId: 'p1',
  packageTitle: 'UTS Matematika',
  classroomId: 'c1',
  classroomName: 'VII A',
  semesterId: 'sem',
  eventId: null,
  type: 'UTS',
  startsAt: toInstant('2030-11-02', '08:00'),
  endsAt: toInstant('2030-11-02', '11:00'),
  durationMinutes: 90,
  status: 'SCHEDULED',
  kind: 'REGULAR' as const,
  makeupOfId: null,
  hasSessions: false,
  createdById: 'u1',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
}

function open(props: Record<string, unknown> = {}) {
  return mount(ScheduleFormDialog, {
    props: { open: true, ...props },
    global: { stubs },
  })
}

const buttonByText = (host: unknown, text: string) =>
  (host as VueWrapper)
    .findAll('button')
    .find(
      (candidateButton) =>
        candidateButton.text() === text ||
        candidateButton.attributes('aria-label') === text,
    )

async function choose(host: unknown, index: number, value: string) {
  const selects = (host as VueWrapper).findAllComponents({
    name: 'SelectStub',
  })
  ;(
    selects[index].vm as unknown as {
      $emit: (event: string, value?: unknown) => void
    }
  ).$emit('update:modelValue', value)
  await flushPromises()
}

describe('ScheduleFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadPackages.mockResolvedValue(packages)
    loadClassrooms.mockResolvedValue(classrooms)
    loadEvents.mockResolvedValue(events)
  })

  it('offers the classrooms of the chosen package grade', async () => {
    const wrapper = open()
    await flushPromises()
    expect(loadClassrooms).not.toHaveBeenCalled()

    await choose(wrapper, 0, 'p1')

    expect(loadClassrooms).toHaveBeenCalledWith('g7')
    expect(wrapper.text()).toContain('VII A')
    wrapper.unmount()
  })

  it('takes the package from the page it was opened from', async () => {
    const wrapper = open({ packageId: 'p2' })
    await flushPromises()

    expect(loadClassrooms).toHaveBeenCalledWith('g8')
    expect(wrapper.text()).toContain('UTS IPA')
    expect(wrapper.findAllComponents({ name: 'SelectStub' })).toHaveLength(3)
    wrapper.unmount()
  })

  it('hides the package and the classroom when editing', async () => {
    const wrapper = open({ schedule: existing })
    await flushPromises()

    expect(loadPackages).not.toHaveBeenCalled()
    expect(wrapper.findAllComponents({ name: 'SelectStub' })).toHaveLength(2)
    expect(wrapper.text()).toContain('Ubah Jadwal')
    expect(wrapper.text()).toContain('UTS Matematika')
    wrapper.unmount()
  })

  it('shows what is missing and keeps Simpan disabled', async () => {
    const wrapper = open()
    await flushPromises()

    expect(wrapper.text()).toContain('Pilih paket')
    expect(
      buttonByText(wrapper, 'Simpan')!.attributes('disabled'),
    ).toBeDefined()
    wrapper.unmount()
  })

  it('offers the five exam types and sends the chosen one', async () => {
    saveSchedule.mockResolvedValue({ success: true, data: existing })
    const wrapper = open({ schedule: existing })
    await flushPromises()

    expect(wrapper.text()).toContain('Jenis ujian')
    for (const label of ['Ulangan Harian', 'Quiz', 'Tugas', 'UTS', 'UAS']) {
      expect(wrapper.text()).toContain(label)
    }

    await choose(wrapper, 1, 'UAS')
    await buttonByText(wrapper, 'Simpan')!.trigger('click')
    await flushPromises()

    expect(saveSchedule).toHaveBeenCalledWith(
      { mode: 'edit', id: 's1' },
      expect.objectContaining({ type: 'UAS' }),
    )
    wrapper.unmount()
  })

  it('locks the type once students have started', async () => {
    const wrapper = open({ schedule: { ...existing, hasSessions: true } })
    await flushPromises()

    expect(
      wrapper
        .findAllComponents({ name: 'SelectStub' })[1]
        .attributes('disabled'),
    ).toBeDefined()
    wrapper.unmount()
  })

  it('saves, announces it and closes', async () => {
    saveSchedule.mockResolvedValue({ success: true, data: existing })
    const wrapper = open({ schedule: existing })
    await flushPromises()

    await buttonByText(wrapper, 'Simpan')!.trigger('click')
    await flushPromises()

    expect(saveSchedule).toHaveBeenCalledWith(
      { mode: 'edit', id: 's1' },
      expect.objectContaining({ durationMinutes: 90 }),
    )
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    wrapper.unmount()
  })

  it('keeps the dialog open and shows the server message when saving fails', async () => {
    saveSchedule.mockResolvedValue({
      success: false,
      error: 'Kelas bukan kelas tahun ajaran aktif',
    })
    const wrapper = open({ schedule: existing })
    await flushPromises()

    await buttonByText(wrapper, 'Simpan')!.trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Kelas bukan kelas tahun ajaran aktif',
    )
    expect(wrapper.emitted('saved')).toBeUndefined()
    wrapper.unmount()
  })

  it('ignores a slow answer for a package that is no longer chosen', async () => {
    let slow: (rooms: unknown[]) => void = () => undefined
    loadClassrooms.mockImplementation((gradeId: string) =>
      gradeId === 'g7'
        ? new Promise((resolve) => {
            slow = resolve
          })
        : Promise.resolve([{ id: 'c8', displayName: 'VIII A' }]),
    )
    const wrapper = open()
    await flushPromises()

    await choose(wrapper, 0, 'p1')
    await choose(wrapper, 0, 'p2')
    slow([{ id: 'c7', displayName: 'VII A' }])
    await flushPromises()

    expect(wrapper.text()).toContain('VIII A')
    expect(wrapper.text()).not.toContain('VII A')
    wrapper.unmount()
  })

  it('says when the grade has no active classroom', async () => {
    loadClassrooms.mockResolvedValue([])
    const wrapper = open()
    await flushPromises()

    await choose(wrapper, 0, 'p1')

    expect(wrapper.text()).toContain('Tidak ada kelas aktif untuk tingkat ini')
    wrapper.unmount()
  })

  it('uses the grade and title it was given and does not look the package up', async () => {
    const wrapper = open({
      packageId: 'p9',
      packageGradeId: 'g9',
      packageTitle: 'UTS Fiqih',
    })
    await flushPromises()

    expect(loadPackages).not.toHaveBeenCalled()
    expect(loadClassrooms).toHaveBeenCalledWith('g9')
    expect(wrapper.text()).toContain('UTS Fiqih')
    wrapper.unmount()
  })

  it('does not let a window of several days be saved from here', async () => {
    const wrapper = open({
      schedule: { ...existing, endsAt: toInstant('2030-11-04', '12:00') },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('lebih dari satu hari')
    expect(
      buttonByText(wrapper, 'Simpan')!.attributes('disabled'),
    ).toBeDefined()
    wrapper.unmount()
  })
})
