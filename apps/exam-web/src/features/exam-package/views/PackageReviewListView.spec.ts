// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import PackageReviewListView from './PackageReviewListView.vue'

const { push, filters, loadReferences } = vi.hoisted(() => ({
  push: vi.fn(),
  filters: { value: null as null | Record<string, { value: string }> },
  loadReferences: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../services/examPackageService', () => ({
  examPackageService: { loadReferences },
}))
vi.mock('../composables/usePackageList', () => ({
  usePackageList: (captured: Record<string, { value: string }>) => {
    filters.value = captured
    return {
      packages: ref([
        {
          id: 'p1',
          title: 'UAS Matematika',
          subjectId: 'math',
          gradeId: 'g7',
          status: 'SUBMITTED',
          lockedAt: null,
          createdById: 'u1',
          createdAt: '2026-10-29T00:00:00.000Z',
          updatedAt: '2026-10-29T03:30:00.000Z',
          itemCount: 12,
        },
      ]),
      totalItems: ref(1),
      loading: ref(false),
      listError: ref(null),
      filtersPending: ref(false),
      refresh: vi.fn(),
    }
  },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  template: '<button :disabled="disabled" type="button"><slot /></button>',
})
const searchInput = defineComponent({
  props: { modelValue: String, label: String },
  template: '<input />',
})

describe('PackageReviewListView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('asks for the submitted packages only', async () => {
    const wrapper = mount(PackageReviewListView, {
      global: {
        stubs: { Card: passthrough, Button: button, SearchInput: searchInput },
      },
    })
    await flushPromises()

    expect(filters.value?.status.value).toBe('SUBMITTED')
    expect(filters.value?.subjectId.value).toBe('ALL')
    expect(loadReferences).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('opens the review page of a package from its row', async () => {
    const wrapper = mount(PackageReviewListView, {
      global: {
        stubs: { Card: passthrough, Button: button, SearchInput: searchInput },
      },
    })
    await flushPromises()

    ;(
      wrapper.findComponent({ name: 'DataTable' }).vm as unknown as {
        $emit: (event: string, value?: unknown) => void
      }
    ).$emit('row-click', { id: 'p1' })

    expect(push).toHaveBeenCalledWith('/exam/package-approvals/p1')
    wrapper.unmount()
  })
})
