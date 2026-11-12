// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import MakeupDialog from './MakeupDialog.vue'
import type { ExamSchedule } from '../types'
import { toInstant } from '../utils/instant'

const { loadAbsentees, loadPackages, createMakeup } = vi.hoisted(() => ({
  loadAbsentees: vi.fn(),
  loadPackages: vi.fn(),
  createMakeup: vi.fn(),
}))
vi.mock('../services/examScheduleService', () => ({
  examScheduleService: { loadAbsentees, loadPackages, createMakeup },
}))

type Wrapper = Pick<VueWrapper, 'findAll' | 'get'>

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const dialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  template: '<button :disabled="disabled" type="button"><slot /></button>',
})
const field = defineComponent({
  props: { label: String, for: String, floating: Boolean },
  template: '<div><label :for="$props.for">{{ label }}</label><slot /></div>',
})
const select = defineComponent({
  name: 'SelectStub',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: '<div><slot /></div>',
})
const checkbox = defineComponent({
  props: { modelValue: Boolean, disabled: Boolean },
  emits: ['update:modelValue'],
  template:
    '<input type="checkbox" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
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
  Checkbox: checkbox,
  FloatingLabelField: field,
  Select: select,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  DatePicker: textInput,
  Input: textInput,
  FormattedNumberInput: numberInput,
}

const original: ExamSchedule = {
  id: 's1',
  packageId: 'p1',
  packageTitle: 'UTS Matematika',
  classroomId: 'c1',
  classroomName: 'VII A',
  semesterId: 'sem',
  eventId: null,
  activityId: null,
  category: 'EXAM',
  minSubmitMinutes: 0,
  type: 'MIDTERM',
  kind: 'REGULAR',
  makeupOfId: null,
  startsAt: toInstant('2026-11-02', '08:00'),
  endsAt: toInstant('2026-11-02', '11:00'),
  durationMinutes: 90,
  status: 'SCHEDULED',
  hasSessions: true,
  createdById: 'u1',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
}

const buttonByText = (host: Wrapper, text: string) =>
  host.findAll('button').find((candidate) => candidate.text().startsWith(text))

async function open() {
  const wrapper = mount(MakeupDialog, {
    props: { open: true, schedule: original },
    global: { stubs },
  })
  await flushPromises()
  return wrapper
}

async function fillWindow(wrapper: Wrapper) {
  await wrapper.get('input[id$="-start-date"]').setValue('2026-11-04')
  await wrapper.get('input[id$="-end-date"]').setValue('2026-11-04')
  await wrapper.get('input[id$="-start"]').setValue('08:00')
  await wrapper.get('input[id$="-end"]').setValue('11:00')
}

describe('MakeupDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadPackages.mockResolvedValue([{ id: 'p1', title: 'UTS Matematika' }])
    loadAbsentees.mockResolvedValue({
      success: true,
      data: [
        { studentId: 'a', name: 'Ani', nis: '1', eligible: true, reason: null },
        {
          studentId: 'c',
          name: 'Citra',
          nis: '3',
          eligible: false,
          reason: 'ALREADY_SAT',
        },
      ],
    })
  })

  it('lists the students and says why one cannot be chosen', async () => {
    const wrapper = await open()

    expect(wrapper.text()).toContain('Ani')
    expect(wrapper.text()).toContain('Citra')
    expect(wrapper.text()).toContain('Sudah mengikuti ujian')
    const boxes = wrapper.findAll('input[type="checkbox"]')
    expect(boxes[0].attributes('disabled')).toBeUndefined()
    expect(boxes[1].attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('keeps the button disabled until a student and a valid window are chosen, and counts them', async () => {
    const wrapper = await open()
    expect(
      buttonByText(wrapper, 'Buat susulan')!.attributes('disabled'),
    ).toBeDefined()

    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    expect(
      buttonByText(wrapper, 'Buat susulan')!.attributes('disabled'),
    ).toBeDefined()
    await fillWindow(wrapper)

    expect(
      buttonByText(wrapper, 'Buat susulan (1)')!.attributes('disabled'),
    ).toBeUndefined()
    wrapper.unmount()
  })

  it('creates the makeup, announces it and closes', async () => {
    createMakeup.mockResolvedValue({ success: true, data: { id: 'm1' } })
    const wrapper = await open()
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    await fillWindow(wrapper)

    await buttonByText(wrapper, 'Buat susulan')!.trigger('click')
    await flushPromises()

    expect(createMakeup).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({
        packageId: 'p1',
        participants: [{ studentId: 'a', reason: 'SICK' }],
      }),
    )
    expect(wrapper.emitted('created')).toEqual([['m1']])
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    wrapper.unmount()
  })

  it('shows the server message and stays open when the makeup is refused', async () => {
    createMakeup.mockResolvedValue({
      success: false,
      error: 'Ani sudah terdaftar di susulan lain',
    })
    const wrapper = await open()
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    await fillWindow(wrapper)

    await buttonByText(wrapper, 'Buat susulan')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Ani sudah terdaftar di susulan lain')
    expect(wrapper.emitted('created')).toBeUndefined()
    wrapper.unmount()
  })

  it('selects every student who can sit with Pilih semua', async () => {
    const wrapper = await open()

    await buttonByText(wrapper, 'Pilih semua')!.trigger('click')

    expect(buttonByText(wrapper, 'Buat susulan')).toBeDefined()
    const boxes = wrapper.findAll('input[type="checkbox"]')
    expect((boxes[0].element as HTMLInputElement).checked).toBe(true)
    expect((boxes[1].element as HTMLInputElement).checked).toBe(false)
    wrapper.unmount()
  })

  it('says so when the students cannot be loaded, or when everyone already sat the exam', async () => {
    loadAbsentees.mockResolvedValue({ success: false, error: 'Gagal memuat' })
    const failed = await open()
    expect(failed.text()).toContain('Gagal memuat')
    failed.unmount()

    loadAbsentees.mockResolvedValue({ success: true, data: [] })
    const empty = await open()
    expect(empty.text()).toContain('Tidak ada siswa di kelas ini')
    empty.unmount()
  })

  it('shows a reason and a note for each chosen student and sends them', async () => {
    createMakeup.mockResolvedValue({ success: true, data: { id: 'm1' } })
    const wrapper = await open()
    expect(
      wrapper.find('input[placeholder="Catatan (opsional)"]').exists(),
    ).toBe(false)
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)

    await wrapper
      .get('input[placeholder="Catatan (opsional)"]')
      .setValue('Demam')
    await fillWindow(wrapper)
    await buttonByText(wrapper, 'Buat susulan')!.trigger('click')
    await flushPromises()

    expect(createMakeup).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({
        participants: [{ studentId: 'a', reason: 'SICK', note: 'Demam' }],
      }),
    )
    wrapper.unmount()
  })
})
