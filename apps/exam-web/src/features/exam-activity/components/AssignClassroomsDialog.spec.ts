// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import AssignClassroomsDialog from './AssignClassroomsDialog.vue'
import type { ExamActivityRecord } from '../types'

const { assignClassrooms, getClassrooms } = vi.hoisted(() => ({
  assignClassrooms: vi.fn(),
  getClassrooms: vi.fn(),
}))

vi.mock('../api/examActivityApi', () => ({
  examActivityApi: { assignClassrooms },
}))
vi.mock('@/features/lookup/classroom', () => ({
  classroomApi: { getClassrooms },
}))
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean, type: String },
  template:
    '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
})
const stubs = {
  Dialog: passthrough,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  DialogBody: passthrough,
  DialogFooter: passthrough,
  Button: button,
}

const activity = {
  id: 'act-x',
  gradeId: 'grade-7',
} as unknown as ExamActivityRecord

const open = () =>
  mount(AssignClassroomsDialog, {
    props: { open: true, activity },
    global: { stubs },
  })

const assignButton = (wrapper: ReturnType<typeof open>) =>
  wrapper.findAll('button').find((item) => item.text() === 'Tetapkan kelas')!

describe('AssignClassroomsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getClassrooms.mockResolvedValue({
      data: [
        { id: 'c7a', gradeId: 'grade-7', displayName: 'VII A' },
        { id: 'c7b', gradeId: 'grade-7', displayName: 'VII B' },
        { id: 'c9', gradeId: 'grade-9', displayName: 'IX A' },
      ],
    })
  })

  it('offers only the classrooms of the activity grade', async () => {
    const wrapper = open()
    await flushPromises()

    expect(wrapper.text()).toContain('VII A')
    expect(wrapper.text()).not.toContain('IX A')
  })

  it('leaves out the classrooms that already have a schedule', async () => {
    const wrapper = mount(AssignClassroomsDialog, {
      props: { open: true, activity, assignedIds: ['c7a'] },
      global: { stubs },
    })
    await flushPromises()

    expect(wrapper.text()).not.toContain('VII A')
    expect(wrapper.text()).toContain('VII B')
  })

  it('keeps the button disabled until a classroom is chosen', async () => {
    const wrapper = open()
    await flushPromises()

    expect(assignButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('assigns the chosen classrooms and reports it', async () => {
    assignClassrooms.mockResolvedValue({ id: 'act-x' })
    const wrapper = open()
    await flushPromises()

    const boxes = wrapper.findAll('input[type="checkbox"]')
    await boxes[0].setValue(true)
    await boxes[1].setValue(true)
    await assignButton(wrapper).trigger('click')
    await flushPromises()

    expect(assignClassrooms).toHaveBeenCalledWith('act-x', {
      classroomIds: ['c7a', 'c7b'],
    })
    expect(wrapper.emitted('assigned')).toHaveLength(1)
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('shows the server message and stays open when assigning fails', async () => {
    assignClassrooms.mockRejectedValue({
      response: { status: 409, data: { message: 'Kelas sudah terjadwal' } },
    })
    const wrapper = open()
    await flushPromises()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await assignButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Kelas sudah terjadwal',
    )
    expect(wrapper.emitted('assigned')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })
})
