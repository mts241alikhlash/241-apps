// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import AttachPackageDialog from './AttachPackageDialog.vue'
import type { ExamActivityRecord } from '../types'

const { attachPackage, getPackages, getClassrooms } = vi.hoisted(() => ({
  attachPackage: vi.fn(),
  getPackages: vi.fn(),
  getClassrooms: vi.fn(),
}))

vi.mock('../api/examActivityApi', () => ({
  examActivityApi: { attachPackage },
}))
vi.mock('@/features/exam-package/api/examPackageApi', () => ({
  examPackageApi: { getPackages },
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
  subjectId: 'sub-1',
  packageId: null,
} as unknown as ExamActivityRecord

const open = () =>
  mount(AttachPackageDialog, {
    props: { open: true, activity },
    global: { stubs },
  })

describe('AttachPackageDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPackages.mockResolvedValue({
      data: [
        { id: 'p1', title: 'UTS Matematika', status: 'APPROVED' },
        { id: 'p2', title: 'Naskah Draf', status: 'DRAFT' },
        { id: 'p3', title: 'Naskah Terkunci', status: 'LOCKED' },
      ],
    })
    getClassrooms.mockResolvedValue({
      data: [
        { id: 'c7', gradeId: 'grade-7', displayName: 'VII A' },
        { id: 'c9', gradeId: 'grade-9', displayName: 'IX A' },
      ],
    })
  })

  it('offers only approved or locked packages of the activity subject and grade', async () => {
    const wrapper = open()
    await flushPromises()

    expect(getPackages).toHaveBeenCalledWith(
      expect.objectContaining({ subjectId: 'sub-1', gradeId: 'grade-7' }),
    )
    expect(wrapper.text()).toContain('UTS Matematika')
    expect(wrapper.text()).toContain('Naskah Terkunci')
    expect(wrapper.text()).not.toContain('Naskah Draf')
  })

  it('offers only the classrooms of the activity grade', async () => {
    const wrapper = open()
    await flushPromises()

    expect(wrapper.text()).toContain('VII A')
    expect(wrapper.text()).not.toContain('IX A')
  })

  it('attaches the chosen package to the chosen classrooms', async () => {
    attachPackage.mockResolvedValue({ id: 'act-x' })
    const wrapper = open()
    await flushPromises()

    await wrapper.find('#attach-package').setValue('p1')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Pasang paket')!
      .trigger('click')
    await flushPromises()

    expect(attachPackage).toHaveBeenCalledWith('act-x', {
      packageId: 'p1',
      classroomIds: ['c7'],
    })
    expect(wrapper.emitted('attached')).toHaveLength(1)
  })
})
