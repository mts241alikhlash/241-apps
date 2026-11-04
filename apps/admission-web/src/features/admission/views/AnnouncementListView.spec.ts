// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import AnnouncementListView from './AnnouncementListView.vue'
import {
  CARDS,
  cardRow,
  cardRows,
  nextCardPage,
  rowActionProps,
} from '@/test/dataTableCards'
const filtersPending = ref(false)
beforeEach(() => {
  filtersPending.value = false
})

const state = vi.hoisted(() => ({
  announcements: [] as unknown[],
  error: null as string | null,
  loading: false,
  publish: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
  search: null as { value: string } | null,
  total: null as number | null,
  page: null as { value: number } | null,
}))
vi.mock('../composables/useAnnouncementList', async () => {
  const { computed, ref } = await import('vue')
  return {
    useAnnouncementList: (
      search: { value: string },
      _status: unknown,
      _wave: unknown,
      page: { value: number },
    ) => {
      state.search = search
      state.page = page
      return {
        announcements: computed(() => state.announcements),
        waves: ref([]),
        totalItems: computed(() => state.total ?? state.announcements.length),
        listError: computed(() => state.error),
        loading: computed(() => state.loading),
        filtersPending,
        refresh: state.refresh,
        isSaving: ref(false),
        fetchWaves: vi.fn(),
        saveAnnouncement: vi.fn(),
        publishAnnouncement: state.publish,
        deleteAnnouncement: state.remove,
      }
    },
  }
})

it('shows the announcements of the page and exposes filters behind one button', async () => {
  state.error = null
  filtersPending.value = false
  state.total = 11
  state.announcements = Array.from({ length: 10 }, (_, index) => ({
    id: `a-${index}`,
    title: `Pengumuman ${index}`,
    isPublished: false,
    wave: null,
    publishedAt: null,
  }))
  const wrapper = mountView()
  expect(cardRows(wrapper)).toHaveLength(10)
  expect(wrapper.get(CARDS).text()).toContain('1 / 2')
  expect(
    wrapper.findAll('button').some((button) => button.text() === 'Filter'),
  ).toBe(true)
  await nextCardPage(wrapper).trigger('click')
  expect(state.page?.value).toBe(2)
  state.total = null
  wrapper.unmount()
})

it('hides old mobile announcements while filtering', async () => {
  state.error = null
  filtersPending.value = false
  state.announcements = [
    { id: 'old', title: 'Old Announcement', isPublished: false, wave: null },
  ]
  const wrapper = mountView()
  filtersPending.value = true
  await flushPromises()
  expect(cardRows(wrapper)).toHaveLength(0)
  expect(wrapper.find('[data-slot="skeleton"]').exists()).toBe(true)
  wrapper.unmount()
})
const stubs = Object.fromEntries(
  [
    'Card',
    'CardHeader',
    'CardTitle',
    'AlertDialog',
    'AlertDialogContent',
    'AlertDialogHeader',
    'AlertDialogTitle',
    'AlertDialogDescription',
    'AlertDialogFooter',
  ].map((name) => [name, { template: '<div><slot /></div>' }]),
)
const mountView = () =>
  mount(AnnouncementListView, {
    global: {
      stubs: {
        ...stubs,
        AlertDialogAction: {
          template:
            '<button data-test="confirm-announcement-action"><slot /></button>',
        },
        AlertDialogCancel: { template: '<button><slot /></button>' },
        AnnouncementFormDialog: true,
        Tooltip: stubs.Card,
        TooltipTrigger: stubs.Card,
        TooltipContent: stubs.Card,
      },
    },
  })

it('shows mobile draft and waits for confirmation before publishing or deleting', async () => {
  state.announcements = [
    {
      id: 'a-1',
      title: 'Pengumuman Uji',
      wave: { name: 'Gelombang Satu' },
      isPublished: false,
      publishedAt: null,
    },
  ]
  state.error = null
  state.refresh.mockReset()
  state.publish.mockReset().mockResolvedValue({ success: true })
  state.remove.mockReset().mockResolvedValue({ success: true })
  const wrapper = mountView()
  const mobile = wrapper.get(CARDS)
  const publishButton = () =>
    cardRow(wrapper)
      .findAll('button')
      .find((button) => button.text() === 'Terbitkan')!
  expect(mobile.text()).toContain('Pengumuman Uji')
  expect(mobile.text()).toContain('Gelombang Satu')
  expect(mobile.text()).toContain('Draft')
  await publishButton().trigger('click')
  expect(state.publish).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('akan menerima notifikasi')
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Batal')!
    .trigger('click')
  expect(state.publish).not.toHaveBeenCalled()
  await publishButton().trigger('click')
  await wrapper
    .get('[data-test="confirm-announcement-action"]')
    .trigger('click')
  await flushPromises()
  expect(state.publish).toHaveBeenCalledExactlyOnceWith('a-1')
  expect(state.refresh).toHaveBeenCalledOnce()
  rowActionProps(wrapper, state.announcements[0]).onDelete()
  await flushPromises()
  expect(wrapper.text()).toContain('Pengumuman ini akan dihapus')
  expect(state.remove).not.toHaveBeenCalled()
  await wrapper
    .get('[data-test="confirm-announcement-action"]')
    .trigger('click')
  await flushPromises()
  expect(state.remove).toHaveBeenCalledExactlyOnceWith('a-1')
})

it('distinguishes empty results from failed loads and sends search to the list', async () => {
  state.announcements = []
  state.error = null
  expect(mountView().text()).toContain('Tidak ada data.')
  state.error = 'offline'
  const failed = mountView()
  expect(failed.text()).not.toContain('Tidak ada data.')
  await failed
    .findAll('button')
    .find((button) => button.text() === 'Coba lagi')!
    .trigger('click')
  expect(state.refresh).toHaveBeenCalled()
  state.error = null
  state.announcements = [
    { id: 'a-1', title: 'Informasi', isPublished: true, wave: null },
  ]
  const wrapper = mountView()
  await wrapper
    .get('input[aria-label="Cari pengumuman"]')
    .setValue('tidak cocok')
  expect(state.search?.value).toBe('tidak cocok')
})
