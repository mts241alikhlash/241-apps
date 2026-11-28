// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import ActivityCreateView from './ActivityCreateView.vue'
import { examEventService } from '@/features/exam-event/services/examEventService'

const {
  create,
  assignClassrooms,
  push,
  success,
  fail,
  permissions,
  routeState,
} = vi.hoisted(() => ({
  create: vi.fn(),
  assignClassrooms: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  fail: vi.fn(),
  permissions: new Set<string>(),
  routeState: {
    meta: { category: 'EXAM' },
    query: {},
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ push }),
}))
vi.mock('vue-sonner', () => ({ toast: { success, error: fail } }))
vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: (code: string) => permissions.has(code),
  }),
}))
vi.mock('../api/examActivityApi', () => ({
  examActivityApi: { create, assignClassrooms },
}))
vi.mock('@/features/lookup/semester', () => ({
  semesterApi: {
    getSemesters: vi
      .fn()
      .mockResolvedValue({ data: [{ id: 'sem-1', isActive: true }] }),
  },
}))
vi.mock('@/features/lookup/classroom', () => ({
  classroomApi: { getClassrooms: vi.fn().mockResolvedValue({ data: [] }) },
}))
vi.mock('@/features/lookup/subject', () => ({
  subjectApi: { getSubjects: vi.fn().mockResolvedValue({ data: [] }) },
}))
vi.mock('@/features/exam-package/api/examPackageApi', () => ({
  examPackageApi: { getPackages: vi.fn().mockResolvedValue({ data: [] }) },
}))
vi.mock('@/features/exam-event/services/examEventService', () => ({
  examEventService: {
    loadEventOptions: vi
      .fn()
      .mockResolvedValue([{ id: 'ev-1', name: 'UAS', type: 'FINAL' }]),
  },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const formStub = defineComponent({
  name: 'ActivityForm',
  props: { isAdmin: Boolean, canManageEvents: Boolean, fixedEventId: String },
  emits: ['submit'],
  template: '<div data-test="form" />',
})

const stubs = {
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  CardFooter: passthrough,
  ActivityForm: formStub,
}

describe('ActivityCreateView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissions.clear()
    routeState.meta = { category: 'EXAM' }
    routeState.query = {}
  })

  it('does not hand admin rights to a teacher, and passes canManageEvents and admin rights properly', async () => {
    const teacher = mount(ActivityCreateView, { global: { stubs } })
    await flushPromises()
    expect(teacher.findComponent(formStub).props('isAdmin')).toBe(false)
    expect(teacher.findComponent(formStub).props('canManageEvents')).toBe(false)
    teacher.unmount()

    permissions.add('exam-events.manage')
    const staff = mount(ActivityCreateView, { global: { stubs } })
    await flushPromises()
    expect(staff.findComponent(formStub).props('isAdmin')).toBe(false)
    expect(staff.findComponent(formStub).props('canManageEvents')).toBe(true)
    staff.unmount()

    permissions.add('exam-schedules.manage-all')
    const manager = mount(ActivityCreateView, { global: { stubs } })
    await flushPromises()
    expect(manager.findComponent(formStub).props('isAdmin')).toBe(true)
    expect(manager.findComponent(formStub).props('canManageEvents')).toBe(true)
    manager.unmount()
  })

  it('fixes the period of the page it was opened from', async () => {
    routeState.query = { periode: 'ev-1' }
    const wrapper = mount(ActivityCreateView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.findComponent(formStub).props('fixedEventId')).toBe('ev-1')
    wrapper.unmount()
  })

  it('loads exam event options only for EXAM and skips them for NON_EXAM', async () => {
    routeState.meta = { category: 'NON_EXAM' }
    const classworkView = mount(ActivityCreateView, { global: { stubs } })
    await flushPromises()
    expect(examEventService.loadEventOptions).not.toHaveBeenCalled()
    classworkView.unmount()

    routeState.meta = { category: 'EXAM' }
    const examView = mount(ActivityCreateView, { global: { stubs } })
    await flushPromises()
    expect(examEventService.loadEventOptions).toHaveBeenCalledWith('sem-1')
    examView.unmount()
  })

  describe('submitting', () => {
    const submitWith = async (payload: Record<string, unknown>) => {
      routeState.meta = { category: 'EXAM' }
      const wrapper = mount(ActivityCreateView, { global: { stubs } })
      await flushPromises()
      wrapper.findComponent(formStub).vm.$emit('submit', payload)
      await flushPromises()
      wrapper.unmount()
    }

    beforeEach(() => {
      create.mockResolvedValue({ id: 'act-9' })
      assignClassrooms.mockResolvedValue({ id: 'act-9' })
    })

    it('assigns the chosen classrooms of an offline activity after creating it', async () => {
      await submitWith({ deliveryMode: 'OFFLINE', classroomIds: ['c1', 'c2'] })

      expect(assignClassrooms).toHaveBeenCalledWith('act-9', {
        classroomIds: ['c1', 'c2'],
      })
      expect(success).toHaveBeenCalledWith(
        'Kegiatan disimpan dan jadwal kelas dibuat',
      )
      expect(push).toHaveBeenCalledWith('/exam/activities/act-9')
    })

    it('does not assign when a package creates the schedules', async () => {
      await submitWith({ packageId: 'p1', classroomIds: ['c1'] })

      expect(assignClassrooms).not.toHaveBeenCalled()
      expect(push).toHaveBeenCalledWith('/exam/activities/act-9')
    })

    it('does not assign when no classroom was chosen', async () => {
      await submitWith({ deliveryMode: 'OFFLINE', classroomIds: [] })

      expect(assignClassrooms).not.toHaveBeenCalled()
      expect(success).toHaveBeenCalledWith('Kegiatan disimpan')
    })

    it('tells the activity was saved when assigning fails and still opens the detail', async () => {
      assignClassrooms.mockRejectedValue(new Error('x'))
      await submitWith({ deliveryMode: 'OFFLINE', classroomIds: ['c1'] })

      expect(fail).toHaveBeenCalledWith(
        expect.stringContaining('Kegiatan sudah disimpan'),
      )
      expect(fail).toHaveBeenCalledWith(
        expect.stringContaining('Tetapkan kelas'),
      )
      expect(push).toHaveBeenCalledWith('/exam/activities/act-9')
    })
  })
})
