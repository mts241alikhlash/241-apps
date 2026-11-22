// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import ActivityCreateView from './ActivityCreateView.vue'

const { create, permissions, routeState } = vi.hoisted(() => ({
  create: vi.fn(),
  permissions: new Set<string>(),
  routeState: {
    meta: { category: 'EXAM' },
    query: {},
  },
}))

vi.mock('vue-router', () => ({ useRoute: () => routeState }))
vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: (code: string) => permissions.has(code),
  }),
}))
vi.mock('../api/examActivityApi', () => ({
  examActivityApi: { create },
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
  props: { isAdmin: Boolean, fixedEventId: String },
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
    routeState.query = {}
  })

  it('does not hand admin rights to a teacher, and admin rights to a manager', async () => {
    const teacher = mount(ActivityCreateView, { global: { stubs } })
    await flushPromises()
    expect(teacher.findComponent(formStub).props('isAdmin')).toBe(false)
    teacher.unmount()

    permissions.add('exam-schedules.manage-all')
    const manager = mount(ActivityCreateView, { global: { stubs } })
    await flushPromises()
    expect(manager.findComponent(formStub).props('isAdmin')).toBe(true)
    manager.unmount()
  })

  it('fixes the period of the page it was opened from', async () => {
    routeState.query = { periode: 'ev-1' }
    const wrapper = mount(ActivityCreateView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.findComponent(formStub).props('fixedEventId')).toBe('ev-1')
    wrapper.unmount()
  })
})
