// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { floatingFieldStub } from '@/test-support/floatingFieldStub'
import ActivityForm from './ActivityForm.vue'

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean, type: String },
  template:
    '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
})
const select = defineComponent({
  name: 'SelectStub',
  props: { modelValue: String, disabled: Boolean },
  emits: ['update:modelValue'],
  template: '<div :disabled="disabled"><slot /></div>',
})
const item = defineComponent({
  props: { value: String },
  template: '<option :value="value"><slot /></option>',
})
const combo = defineComponent({
  name: 'ComboStub',
  props: { modelValue: String, options: Array, disabled: Boolean },
  emits: ['update:modelValue'],
  template: '<div :disabled="disabled" />',
})
const commandItem = defineComponent({
  props: { value: String },
  emits: ['select'],
  template:
    '<button type="button" @click="$emit(\'select\', $event)"><slot /></button>',
})
const textInput = defineComponent({
  props: { modelValue: [String, Number], type: String },
  emits: ['update:modelValue'],
  template:
    '<input :type="type" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const numberInput = defineComponent({
  props: { modelValue: [String, Number] },
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
})

const switchStub = defineComponent({
  name: 'SwitchStub',
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  template:
    '<button type="button" role="switch" :aria-checked="String(modelValue)" @click="$emit(\'update:modelValue\', !modelValue)" />',
})

const stubs = {
  FloatingField: floatingFieldStub,
  FloatingLabelField: passthrough,
  FormControl: passthrough,
  Button: button,
  Select: select,
  SelectContent: passthrough,
  SelectItem: item,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  AppCombobox: combo,
  DatePicker: textInput,
  Input: textInput,
  FormattedNumberInput: numberInput,
  Popover: passthrough,
  PopoverTrigger: passthrough,
  PopoverContent: passthrough,
  Command: passthrough,
  CommandInput: passthrough,
  CommandList: passthrough,
  CommandEmpty: passthrough,
  CommandGroup: passthrough,
  CommandItem: commandItem,
  Switch: switchStub,
}

const props = {
  semesterId: 'sem-1',
  isAdmin: false,
  grades: [
    { id: 'grade-7', label: 'Kelas 7' },
    { id: 'grade-9', label: 'Kelas 9' },
  ],
  classrooms: [
    { id: 'class-7a', gradeId: 'grade-7', label: 'VII-A' },
    { id: 'class-7b', gradeId: 'grade-7', label: 'VII-B' },
    { id: 'class-9a', gradeId: 'grade-9', label: 'IX-A' },
  ],
  packages: [
    { id: 'package-1', subjectId: 'subject-inf', label: 'Informatika' },
  ],
  subjects: [{ id: 'subject-inf', label: 'Informatika' }],
}

const open = (overrides: Record<string, unknown> = {}) =>
  mount(ActivityForm, {
    props: { ...props, ...overrides },
    global: { stubs },
  })

const emitFrom = async (
  host: VueWrapper,
  field: string,
  name: 'SelectStub' | 'ComboStub',
  value: string,
) => {
  ;(
    host.get(`[data-field="${field}"]`).findComponent({ name })
      .vm as unknown as {
      $emit: (event: string, value?: unknown) => void
    }
  ).$emit('update:modelValue', value)
  await flushPromises()
}

const typeInto = async (host: VueWrapper, field: string, value: string) => {
  await host.get(`[data-field="${field}"] input`).setValue(value)
}

const submitForm = async (host: VueWrapper) => {
  await host.get('#activity-form').trigger('submit')
  await new Promise((resolve) => setTimeout(resolve, 30))
  await flushPromises()
}

const classroomButtons = (host: VueWrapper) =>
  host.findAll('[data-field="classroomIds"] button[type="button"]')

const fillBasics = async (host: VueWrapper) => {
  await emitFrom(host, 'gradeId', 'SelectStub', 'grade-7')
  await emitFrom(host, 'subjectId', 'ComboStub', 'subject-inf')
  await typeInto(host, 'startDate', '2026-11-10')
  await typeInto(host, 'startTime', '08:00')
  await typeInto(host, 'endDate', '2026-11-10')
  await typeInto(host, 'endTime', '11:00')
}

describe('ActivityForm delivery mode', () => {
  beforeEach(() => vi.clearAllMocks())

  it('offers Online and Offline and defaults to Online with the package field', () => {
    const wrapper = open()

    const options = wrapper
      .get('[data-field="deliveryMode"]')
      .findAll('option')
      .map((opt) => opt.text())
    expect(options).toEqual(['Online', 'Offline'])
    expect(wrapper.find('[data-field="packageId"]').exists()).toBe(true)
    expect(wrapper.find('[data-field="offlineKind"]').exists()).toBe(false)
    expect(wrapper.find('[data-field="maxScore"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('hides the package for Offline and shows Type and Max score', async () => {
    const wrapper = open()
    await emitFrom(wrapper, 'deliveryMode', 'SelectStub', 'OFFLINE')

    expect(wrapper.find('[data-field="packageId"]').exists()).toBe(false)
    const kinds = wrapper
      .get('[data-field="offlineKind"]')
      .findAll('option')
      .map((opt) => opt.text())
    expect(kinds).toEqual(['Written', 'Practical'])
    expect(wrapper.find('[data-field="maxScore"]').exists()).toBe(true)
    expect(wrapper.find('[data-field="classroomIds"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('requires the Offline type', async () => {
    const wrapper = open()
    await fillBasics(wrapper)
    await emitFrom(wrapper, 'deliveryMode', 'SelectStub', 'OFFLINE')
    await submitForm(wrapper)

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('Tipe wajib dipilih')
    wrapper.unmount()
  })

  it.each([0, 1001])('rejects a max score of %i', async (score) => {
    const wrapper = open()
    await fillBasics(wrapper)
    await emitFrom(wrapper, 'deliveryMode', 'SelectStub', 'OFFLINE')
    await emitFrom(wrapper, 'offlineKind', 'SelectStub', 'WRITTEN')
    await typeInto(wrapper, 'maxScore', String(score))
    await submitForm(wrapper)

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('Nilai maksimal harus 1 sampai 1000')
    wrapper.unmount()
  })

  it('submits the Offline payload without a package', async () => {
    const wrapper = open()
    await fillBasics(wrapper)
    await emitFrom(wrapper, 'deliveryMode', 'SelectStub', 'OFFLINE')
    await emitFrom(wrapper, 'offlineKind', 'SelectStub', 'PRACTICAL')
    await typeInto(wrapper, 'maxScore', '80')
    await submitForm(wrapper)

    const payload = wrapper.emitted('submit')?.[0]?.[0] as Record<
      string,
      unknown
    >
    expect(payload).toMatchObject({
      deliveryMode: 'OFFLINE',
      offlineKind: 'PRACTICAL',
      maxScore: 80,
      autoStatus: true,
    })
    expect(payload).not.toHaveProperty('packageId')
    wrapper.unmount()
  })

  it('submits the Online defaults explicitly', async () => {
    const wrapper = open()
    await fillBasics(wrapper)
    await submitForm(wrapper)

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      deliveryMode: 'ONLINE',
      offlineKind: null,
      maxScore: 100,
      autoStatus: true,
    })
    wrapper.unmount()
  })

  it('sends autoStatus false when the switch is turned off', async () => {
    const wrapper = open()
    await fillBasics(wrapper)
    await wrapper.get('[role="switch"]').trigger('click')
    await submitForm(wrapper)

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      autoStatus: false,
    })
    wrapper.unmount()
  })

  it('states the effective timings as numbers', () => {
    const wrapper = open()

    expect(wrapper.text()).toContain('5 menit sebelum mulai')
    expect(wrapper.text()).toContain('15 menit setelah selesai')
    expect(wrapper.text()).toContain('Toleransi terlambat 15 menit')
    wrapper.unmount()
  })
})

describe('ActivityForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('only offers the classrooms of the chosen grade', async () => {
    const wrapper = open()
    await emitFrom(wrapper, 'gradeId', 'SelectStub', 'grade-7')

    expect(wrapper.text()).toContain('VII-A')
    expect(wrapper.text()).toContain('VII-B')
    expect(wrapper.text()).not.toContain('IX-A')
    wrapper.unmount()
  })

  it('clears the chosen classrooms when the grade changes', async () => {
    const wrapper = open()
    await emitFrom(wrapper, 'gradeId', 'SelectStub', 'grade-7')
    await classroomButtons(wrapper)[1].trigger('click')
    await flushPromises()
    expect(
      wrapper.get('[data-field="classroomIds"] [role="combobox"]').text(),
    ).toContain('VII-A')

    await emitFrom(wrapper, 'gradeId', 'SelectStub', 'grade-9')

    expect(
      wrapper.get('[data-field="classroomIds"] [role="combobox"]').text(),
    ).toBe('Pilih kelas')
    wrapper.unmount()
  })

  it('locks the token to Token berputar when an exam type is chosen', async () => {
    const wrapper = open({
      isAdmin: true,
      events: [{ id: 'ev-1', name: 'UTS Ganjil', type: 'MIDTERM' }],
    })
    await emitFrom(wrapper, 'type', 'SelectStub', 'MIDTERM')

    expect(wrapper.find('[data-field="presetName"]').exists()).toBe(false)
    expect(wrapper.find('[data-field="tokenMode"]').exists()).toBe(false)
    expect(wrapper.find('[data-field="eventId"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('lets non-exam activities choose between the daily and assignment presets', () => {
    const wrapper = open()

    const options = wrapper
      .get('[data-field="presetName"]')
      .findAll('option')
      .map((opt) => (opt.element as HTMLOptionElement).value)
    expect(options).toEqual(['DAILY', 'ASSIGNMENT'])
    wrapper.unmount()
  })

  it('submits the chosen classrooms and the package subject', async () => {
    const wrapper = open()
    await emitFrom(wrapper, 'gradeId', 'SelectStub', 'grade-7')
    await classroomButtons(wrapper)[1].trigger('click')
    await flushPromises()
    await emitFrom(wrapper, 'subjectId', 'ComboStub', 'subject-inf')
    await emitFrom(wrapper, 'packageId', 'ComboStub', 'package-1')
    await typeInto(wrapper, 'startDate', '2026-11-10')
    await typeInto(wrapper, 'startTime', '08:00')
    await typeInto(wrapper, 'endDate', '2026-11-10')
    await typeInto(wrapper, 'endTime', '11:00')
    await submitForm(wrapper)

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      gradeId: 'grade-7',
      classroomIds: ['class-7a', 'class-7b'],
      packageId: 'package-1',
      subjectId: 'subject-inf',
      type: 'DAILY',
      presetName: 'DAILY',
      tokenMode: 'ROTATING',
      durationMinutes: 90,
    })
    wrapper.unmount()
  })

  it('creates an activity without a package and without classrooms', async () => {
    const wrapper = open()
    await emitFrom(wrapper, 'gradeId', 'SelectStub', 'grade-7')
    await emitFrom(wrapper, 'subjectId', 'ComboStub', 'subject-inf')
    await typeInto(wrapper, 'startDate', '2026-11-10')
    await typeInto(wrapper, 'startTime', '08:00')
    await typeInto(wrapper, 'endDate', '2026-11-10')
    await typeInto(wrapper, 'endTime', '11:00')
    await submitForm(wrapper)

    const payload = wrapper.emitted('submit')?.[0]?.[0] as Record<
      string,
      unknown
    >
    expect(payload).toMatchObject({
      gradeId: 'grade-7',
      subjectId: 'subject-inf',
      classroomIds: [],
    })
    expect(payload).not.toHaveProperty('packageId')
    wrapper.unmount()
  })

  it('blocks the form and explains when a teacher has no active midterm period', async () => {
    const wrapper = open({ category: 'EXAM', events: [] })

    expect(wrapper.text()).toContain('Belum ada periode UTS yang aktif')
    await submitForm(wrapper)
    expect(wrapper.emitted('submit')).toBeUndefined()
    wrapper.unmount()
  })

  it('locks the period and the type to the period it was opened from', () => {
    const wrapper = open({
      category: 'EXAM',
      isAdmin: true,
      events: [{ id: 'ev-1', name: 'UAS Ganjil', type: 'FINAL' }],
      fixedEventId: 'ev-1',
    })

    expect(
      wrapper
        .get('[data-field="eventId"]')
        .findComponent({ name: 'ComboStub' })
        .attributes('disabled'),
    ).toBeDefined()
    expect(
      wrapper
        .get('[data-field="type"]')
        .findComponent({ name: 'SelectStub' })
        .attributes('disabled'),
    ).toBeDefined()
    wrapper.unmount()
  })

  it('shows what is missing when the form is empty', async () => {
    const wrapper = open()

    await submitForm(wrapper)

    expect(wrapper.text()).toContain('Tingkat wajib dipilih')
    expect(wrapper.text()).toContain('Mata pelajaran wajib dipilih')
    expect(wrapper.emitted('submit')).toBeUndefined()
    wrapper.unmount()
  })
})
