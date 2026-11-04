// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { TooltipProvider } from '@mts241alikhlash/ui/tooltip'
import {
  cardRow,
  cardRows,
  chooseRowAction,
  nextCardPage,
} from '@/test/dataTableCards'
import DocumentReviewListView from './DocumentReviewListView.vue'

const service = vi.hoisted(() => ({ fetchQueue: vi.fn() }))
vi.mock('../services/documentReviewService', () => ({
  documentReviewService: service,
}))
vi.mock('../services/applicationService', () => ({
  applicationService: { fetchWaves: vi.fn() },
}))

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => router }))

const row = {
  applicationId: 'app1',
  registrationNumber: 'PSB-001',
  applicantName: 'Ahmad Fauzi',
  waveName: 'Gelombang 1',
  status: 'SUBMITTED',
  submittedAt: '2026-10-01T00:00:00.000Z',
  summary: { approved: 3, rejected: 1, pending: 0, missing: 2, total: 6 },
}

function page(
  rows: unknown[],
  counts = { waiting: 1, revision: 2, done: 3 },
  total = rows.length,
) {
  return { rows, total, counts }
}

function mountView() {
  return mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(DocumentReviewListView)),
    }),
    { attachTo: document.body },
  ).findComponent(DocumentReviewListView)
}

function tab(wrapper: ReturnType<typeof mountView>, label: string) {
  return wrapper.findAll('[role="tab"]').find((t) => t.text().includes(label))!
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  service.fetchQueue.mockResolvedValue(page([row]))
})

it('shows Menunggu first with the counts of every tab and the summary of each applicant', async () => {
  const wrapper = mountView()
  await flushPromises()

  expect(service.fetchQueue).toHaveBeenCalledWith(
    expect.objectContaining({ tab: 'waiting', page: 1, limit: 10 }),
  )
  expect(tab(wrapper, 'Menunggu').text()).toContain('1')
  expect(tab(wrapper, 'Perlu perbaikan').text()).toContain('2')
  expect(tab(wrapper, 'Selesai').text()).toContain('3')
  const item = cardRow(wrapper)
  expect(item.text()).toContain('Ahmad Fauzi')
  expect(item.text()).toContain('PSB-001')
  expect(item.text()).toContain('Gelombang 1')
  expect(item.text()).toContain(
    '3 disetujui · 1 ditolak · 2 belum diunggah dari 6 berkas',
  )
})

it('has no add button', async () => {
  const wrapper = mountView()
  await flushPromises()

  expect(
    wrapper.findAll('button').filter((button) => button.text() === 'Tambah'),
  ).toHaveLength(0)
})

it('opens the review page of an applicant', async () => {
  const wrapper = mountView()
  await flushPromises()

  await chooseRowAction(cardRow(wrapper), 'Periksa')

  expect(router.push).toHaveBeenCalledWith('/admin/document-reviews/app1')
})

it('loads another tab when it is opened', async () => {
  const wrapper = mountView()
  await flushPromises()
  service.fetchQueue.mockResolvedValue(page([{ ...row, status: 'VERIFIED' }]))

  await tab(wrapper, 'Selesai').trigger('mousedown')
  await flushPromises()

  expect(service.fetchQueue).toHaveBeenLastCalledWith(
    expect.objectContaining({ tab: 'done', page: 1 }),
  )
})

it('shows revision note and rejected count on revision tab', async () => {
  service.fetchQueue.mockResolvedValue(
    page([
      {
        ...row,
        status: 'REVISION_NEEDED',
        revisionNote: 'Foto KK buram',
        summary: { approved: 2, rejected: 1, pending: 0, missing: 3, total: 6 },
      },
    ]),
  )
  const wrapper = mountView()
  await flushPromises()
  await tab(wrapper, 'Perlu perbaikan').trigger('mousedown')
  await flushPromises()

  expect(wrapper.text()).toContain('1 berkas ditolak')
  expect(wrapper.text()).toContain('Foto KK buram')
})

it('says what an empty tab means', async () => {
  service.fetchQueue.mockResolvedValue(
    page([], { waiting: 0, revision: 0, done: 0 }),
  )
  const wrapper = mountView()
  await flushPromises()

  expect(wrapper.text()).toContain(
    'Tidak ada pendaftar yang menunggu pemeriksaan berkas.',
  )
})

it('loads the next page from the server and replaces the rows', async () => {
  const first = Array.from({ length: 10 }, (_, index) => ({
    ...row,
    applicationId: `app${index}`,
  }))
  service.fetchQueue.mockResolvedValue(
    page(first, { waiting: 60, revision: 0, done: 0 }, 60),
  )
  const wrapper = mountView()
  await flushPromises()
  expect(cardRows(wrapper)).toHaveLength(10)
  service.fetchQueue.mockResolvedValue(
    page(
      [{ ...row, applicationId: 'app10' }],
      { waiting: 60, revision: 0, done: 0 },
      60,
    ),
  )

  await nextCardPage(wrapper).trigger('click')
  await flushPromises()

  expect(service.fetchQueue).toHaveBeenLastCalledWith(
    expect.objectContaining({ tab: 'waiting', page: 2, limit: 10 }),
  )
  expect(cardRows(wrapper)).toHaveLength(1)
})

it('shows the load error with a retry', async () => {
  service.fetchQueue.mockResolvedValue({
    error: 'Gagal memuat antrean berkas.',
  })
  const wrapper = mountView()
  await flushPromises()

  expect(wrapper.text()).toContain('Gagal memuat antrean berkas.')
  service.fetchQueue.mockResolvedValue(page([]))
  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Coba lagi')!
    .trigger('click')
  await flushPromises()

  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
})

it('ignores a slow response from a tab that is no longer shown', async () => {
  let release: (value: unknown) => void = () => undefined
  service.fetchQueue.mockReturnValueOnce(
    new Promise((resolve) => (release = resolve)),
  )
  const wrapper = mountView()
  await flushPromises()

  service.fetchQueue.mockResolvedValue(
    page([{ ...row, applicantName: 'Siti Aminah' }]),
  )
  await tab(wrapper, 'Selesai').trigger('mousedown')
  await flushPromises()
  release(page([row]))
  await flushPromises()

  expect(wrapper.text()).toContain('Siti Aminah')
  expect(wrapper.text()).not.toContain('Ahmad Fauzi')
})

it('renders DataTable with expected columns and without numbering column', async () => {
  const wrapper = mountView()
  await flushPromises()

  const dataTable = wrapper.findComponent({ name: 'DataTable' })
  expect(dataTable.exists()).toBe(true)
  const columns = dataTable.props('columns') as {
    header?: string | (() => string)
  }[]
  const headers = columns.map((c) =>
    typeof c.header === 'function' ? c.header() : c.header,
  )
  expect(headers).not.toContain('No')
  expect(headers).toEqual([
    'No. Pendaftaran',
    'Nama Pendaftar',
    'Gelombang',
    'Berkas',
    'Aksi',
  ])
})
