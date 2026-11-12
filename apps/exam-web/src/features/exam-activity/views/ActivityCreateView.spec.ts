// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import ActivityCreateView from './ActivityCreateView.vue'

const { list, get, permissions, routeState } = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  permissions: new Set<string>(),
  routeState: {
    meta: { category: 'EXAM' },
    query: { id: 'act-1' } as Record<string, string>,
  },
}))

vi.mock('vue-router', () => ({ useRoute: () => routeState }))
vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: (code: string) => permissions.has(code),
  }),
}))
vi.mock('../api/examActivityApi', () => ({
  examActivityApi: { list, get },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const formStub = defineComponent({
  name: 'ActivityForm',
  props: { isAdmin: Boolean, activity: Object },
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

describe('ActivityCreateView in edit mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissions.clear()
    get.mockResolvedValue({
      data: { data: { id: 'act-1', semesterId: 'sem-1' } },
    })
  })

  it('loads the one activity instead of the whole list', async () => {
    mount(ActivityCreateView, { global: { stubs } })
    await flushPromises()

    expect(get).toHaveBeenCalledWith('act-1')
    expect(list).not.toHaveBeenCalled()
  })

  it('does not hand admin rights to a teacher', async () => {
    const wrapper = mount(ActivityCreateView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.findComponent(formStub).props('isAdmin')).toBe(false)
  })
})
