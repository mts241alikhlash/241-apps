// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import SeatGenerateDialog from './SeatGenerateDialog.vue'

const { generateSeats } = vi.hoisted(() => ({ generateSeats: vi.fn() }))
vi.mock('../services/examEventService', () => ({
  examEventService: { generateSeats },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const dialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})
const item = defineComponent({
  props: { value: String },
  template: '<option :value="value"><slot /></option>',
})

const stubs = {
  Dialog: dialog,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  DialogBody: passthrough,
  DialogFooter: passthrough,
  FloatingLabelField: passthrough,
  Select: passthrough,
  SelectContent: passthrough,
  SelectItem: item,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
}

const students = [
  { studentId: 's1', classroomId: 'c1', name: 'Ahmad' },
  { studentId: 's2', classroomId: 'c2', name: 'Siti' },
]

const plan = {
  applied: false,
  adjacentSameClassroom: 0,
  adjacentSameGrade: 0,
  rooms: [
    {
      roomId: 'r1',
      code: 'R01',
      capacity: 32,
      layout: { lanes: 4, left: 16, right: 16, rows: 4 },
    },
  ],
  seats: [
    {
      roomId: 'r1',
      studentId: 's1',
      classroomId: 'c1',
      desk: 1,
      gender: 'FEMALE',
      gradeLevel: 7,
      lane: 1,
      row: 1,
      side: 'LEFT',
    },
  ],
  unseated: [],
  unknownGender: [],
}

const CONFLICT = {
  success: false,
  error: 'Kursi periode ini sudah ada. Konfirmasi untuk menimpa.',
  code: 'SEATS_EXIST',
}

const mountDialog = () =>
  mount(SeatGenerateDialog, {
    props: { eventId: 'e1', students, open: true },
    global: { stubs },
  })

const buttonNamed = (wrapper: ReturnType<typeof mountDialog>, text: string) =>
  wrapper.findAll('button').find((button) => button.text() === text)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SeatGenerateDialog', () => {
  it('previews the plan with the rule values and shows the grid', async () => {
    generateSeats.mockResolvedValue({ success: true, data: plan })
    const wrapper = mountDialog()

    await buttonNamed(wrapper, 'Pratinjau')?.trigger('click')
    await flushPromises()

    expect(generateSeats).toHaveBeenCalledWith('e1', {
      mode: 'preview',
      students: [
        { studentId: 's1', classroomId: 'c1' },
        { studentId: 's2', classroomId: 'c2' },
      ],
      rules: {
        order: 'alphabetical',
        separateGender: true,
        spreadGrades: true,
        spreadClassrooms: true,
        lanesPerSide: 4,
      },
    })
    expect(wrapper.find('[data-desk="1"]').text()).toContain('Ahmad')
  })

  it('applies the plan without replacing existing seats first', async () => {
    generateSeats.mockResolvedValue({ success: true, data: plan })
    const wrapper = mountDialog()

    await buttonNamed(wrapper, 'Terapkan')?.trigger('click')
    await flushPromises()

    expect(generateSeats).toHaveBeenCalledTimes(1)
    expect(generateSeats.mock.calls[0]?.[1]).toMatchObject({ mode: 'apply' })
    expect(generateSeats.mock.calls[0]?.[1]).not.toHaveProperty(
      'replaceExisting',
    )
  })

  it('asks for confirmation before replacing existing seats', async () => {
    generateSeats.mockResolvedValueOnce(CONFLICT).mockResolvedValueOnce({
      success: true,
      data: { ...plan, applied: true },
    })
    const wrapper = mountDialog()

    await buttonNamed(wrapper, 'Terapkan')?.trigger('click')
    await flushPromises()

    expect(generateSeats).toHaveBeenCalledTimes(1)
    expect(generateSeats.mock.calls[0]?.[1]).not.toHaveProperty(
      'replaceExisting',
    )

    await buttonNamed(wrapper, 'Timpa Kursi')?.trigger('click')
    await flushPromises()

    expect(generateSeats).toHaveBeenCalledTimes(2)
    expect(generateSeats.mock.calls[1]?.[1]).toMatchObject({
      mode: 'apply',
      replaceExisting: true,
    })
  })

  it('shows other failures as a plain error without offering to overwrite', async () => {
    generateSeats.mockResolvedValue({
      success: false,
      error: 'Jaringan putus.',
    })
    const wrapper = mountDialog()

    await buttonNamed(wrapper, 'Terapkan')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Jaringan putus.')
    expect(buttonNamed(wrapper, 'Timpa Kursi')).toBeUndefined()
  })
})
