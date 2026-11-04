// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref, type Ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import PackageListView from './PackageListView.vue'
import { useExamPackageStore } from '../stores/examPackageStore'
import type { ExamPackageSummary } from '../types'
import { CARDS, cardRows, rowActionProps } from '@/test/dataTableCards'

const { filters, loadReferences, push, permissions, refresh, copyPackage } =
  vi.hoisted(() => ({
    filters: {} as Record<
      'search' | 'subjectId' | 'gradeId' | 'status',
      Ref<string>
    > &
      Record<'page' | 'pageSize', Ref<number>>,
    loadReferences: vi.fn<() => Promise<void>>(),
    push: vi.fn(),
    permissions: new Set<string>(),
    refresh: vi.fn(),
    copyPackage: vi.fn(),
  }))
const listState = {
  packages: ref<ExamPackageSummary[]>([]),
  totalItems: ref(0),
  loading: ref(false),
  listError: ref<string | null>(null),
  filtersPending: ref(false),
}

vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({
    user: { value: { id: 'u1' } },
    hasPermission: (code: string) => permissions.has(code),
  }),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../services/examPackageService', () => ({
  examPackageService: {
    loadReferences,
    copyPackage,
    deletePackage: vi.fn(),
  },
}))
vi.mock('../composables/usePackageList', () => ({
  usePackageList: (
    state: typeof filters,
    page: Ref<number>,
    pageSize: Ref<number>,
  ) => {
    Object.assign(filters, state, { page, pageSize })
    return { ...listState, refresh }
  },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const floatingField = defineComponent({
  props: { label: String, for: String, floating: Boolean },
  template: '<div><label :for="$props.for">{{ label }}</label><slot /></div>',
})
const searchInput = defineComponent({
  props: { modelValue: String, label: String },
  emits: ['update:modelValue'],
  template:
    '<input :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  template: '<button :disabled="disabled"><slot /></button>',
})
const select = defineComponent({
  name: 'SelectStub',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: '<div><slot /></div>',
})
const trigger = defineComponent({
  props: { id: String },
  template: '<button :id="id" type="button"><slot /></button>',
})
const item = defineComponent({
  props: { value: String },
  template: '<option :value="value"><slot /></option>',
})

const stubs = {
  Button: button,
  Card: passthrough,
  Tooltip: passthrough,
  TooltipTrigger: passthrough,
  TooltipContent: passthrough,
  FloatingLabelField: floatingField,
  SearchInput: searchInput,
  Plus: true,
  Select: select,
  SelectContent: passthrough,
  SelectItem: item,
  SelectTrigger: trigger,
  SelectValue: passthrough,
}

const pkg = (
  overrides: Partial<ExamPackageSummary> = {},
): ExamPackageSummary => ({
  id: 'p1',
  title: 'UTS Matematika Kelas 7',
  subjectId: 'math',
  gradeId: 'g7',
  status: 'DRAFT',
  lockedAt: null,
  createdById: 'u1',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
  itemCount: 12,
  ...overrides,
})

describe('PackageListView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useExamPackageStore()
    store.subjects = [{ id: 'math', name: 'Matematika' }]
    store.grades = [{ id: 'g7', level: 7, name: null }]
    permissions.clear()
    ;['read', 'create', 'delete'].forEach((action) =>
      permissions.add(`exam-packages.${action}`),
    )
    listState.packages.value = [pkg()]
    listState.totalItems.value = 1
    listState.loading.value = false
    listState.listError.value = null
    listState.filtersPending.value = false
    vi.clearAllMocks()
  })

  it('lists each package with title, subject, grade, item count and status', async () => {
    const wrapper = mount(PackageListView, { global: { stubs } })
    await flushPromises()

    const text = wrapper.get(CARDS).text()
    expect(cardRows(wrapper)).toHaveLength(1)
    expect(text).toContain('UTS Matematika Kelas 7')
    expect(text).toContain('Matematika')
    expect(text).toContain('Kelas 7')
    expect(text).toContain('12 soal')
    expect(text).toContain('Draf')
    expect(loadReferences).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows Tambah only with exam-packages.create', async () => {
    const withCreate = mount(PackageListView, { global: { stubs } })
    await flushPromises()
    expect(withCreate.text()).toContain('Tambah')
    withCreate.unmount()

    permissions.delete('exam-packages.create')
    const without = mount(PackageListView, { global: { stubs } })
    await flushPromises()
    expect(without.text()).not.toContain('Tambah')
    without.unmount()
  })

  it('opens the create dialog from Tambah and goes to the new package', async () => {
    const wrapper = mount(PackageListView, {
      global: {
        stubs: {
          ...stubs,
          PackageCreateDialog: defineComponent({
            name: 'PackageCreateDialog',
            props: { open: Boolean },
            emits: ['update:open', 'created'],
            template: '<div v-if="open" data-test="create-dialog" />',
          }),
        },
      },
    })
    await flushPromises()
    expect(wrapper.find('[data-test="create-dialog"]').exists()).toBe(false)

    await wrapper
      .findAll('button')
      .find((candidate) => candidate.text() === 'Tambah')!
      .trigger('click')
    expect(wrapper.find('[data-test="create-dialog"]').exists()).toBe(true)

    const created = wrapper.findComponent({ name: 'PackageCreateDialog' })
    ;(
      created.vm as unknown as { $emit: (event: string, value: string) => void }
    ).$emit('created', 'p9')
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/exam/packages/p9')
    wrapper.unmount()
  })

  it('opens the package when a row is clicked', async () => {
    const wrapper = mount(PackageListView, { global: { stubs } })
    await flushPromises()

    ;(
      wrapper.findComponent({ name: 'DataTable' }).vm as unknown as {
        $emit: (event: string, value?: unknown) => void
      }
    ).$emit('row-click', pkg())

    expect(push).toHaveBeenCalledWith('/exam/packages/p1')
    wrapper.unmount()
  })

  it('offers delete only for draft packages and only with exam-packages.delete', async () => {
    const wrapper = mount(PackageListView, { global: { stubs } })
    await flushPromises()

    expect(rowActionProps(wrapper, pkg()).hideDelete).toBe(false)
    expect(rowActionProps(wrapper, pkg({ status: 'LOCKED' })).hideDelete).toBe(
      true,
    )
    wrapper.unmount()

    permissions.delete('exam-packages.delete')
    const without = mount(PackageListView, { global: { stubs } })
    await flushPromises()
    expect(rowActionProps(without, pkg()).hideDelete).toBe(true)
    without.unmount()
  })

  it('hides delete on a colleague package unless the viewer manages every package', async () => {
    const theirs = pkg({ id: 'p2', createdById: 'u2' })
    listState.packages.value = [theirs]
    const wrapper = mount(PackageListView, { global: { stubs } })
    await flushPromises()
    expect(rowActionProps(wrapper, theirs).hideDelete).toBe(true)
    wrapper.unmount()

    permissions.add('exam-questions.manage-all')
    const manager = mount(PackageListView, { global: { stubs } })
    await flushPromises()
    expect(rowActionProps(manager, theirs).hideDelete).toBe(false)
    manager.unmount()
  })

  it('shows the empty state, and a reset button when filters match nothing', async () => {
    listState.packages.value = []
    listState.totalItems.value = 0
    const wrapper = mount(PackageListView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('Belum ada paket soal.')
    expect(wrapper.text()).not.toContain('Atur Ulang')

    filters.status.value = 'LOCKED'
    await flushPromises()
    expect(wrapper.text()).toContain(
      'Tidak ada paket yang cocok dengan filter.',
    )
    expect(wrapper.text()).toContain('Atur Ulang')
    wrapper.unmount()
  })

  it('shows the error with a retry button', async () => {
    listState.listError.value = 'Gagal memuat daftar paket.'
    const wrapper = mount(PackageListView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Gagal memuat daftar paket.')
    await wrapper
      .findAll('button')
      .find((candidate) => candidate.text() === 'Coba lagi')!
      .trigger('click')
    expect(refresh).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('goes back to the first page when a filter changes', () => {
    listState.totalItems.value = 50
    const wrapper = mount(PackageListView, { global: { stubs } })
    filters.page.value = 3

    filters.subjectId.value = 'math'

    expect(filters.page.value).toBe(1)
    wrapper.unmount()
  })

  it('copies only once when Salin is chosen twice', async () => {
    let finish: (value: unknown) => void = () => undefined
    copyPackage.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const wrapper = mount(PackageListView, { global: { stubs } })
    await flushPromises()
    const items = rowActionProps(wrapper, pkg({ status: 'APPROVED' }))
      .items as unknown as {
      label: string
      onClick: () => void
    }[]
    const copy = items.find((entry) => entry.label === 'Salin')!

    copy.onClick()
    copy.onClick()
    finish({ id: 'p2' })
    await flushPromises()

    expect(copyPackage).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
