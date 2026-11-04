// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { TooltipProvider } from '@mts241alikhlash/ui/tooltip'
import LateDocumentListView from './LateDocumentListView.vue'
import {
  cardRow,
  chooseRowAction,
  menuLabels,
  nextCardPage,
  openRowMenu,
} from '@/test/dataTableCards'

const service = vi.hoisted(() => ({
  fetchList: vi.fn(),
  upload: vi.fn(),
  decide: vi.fn(),
}))
vi.mock('../services/lateDocumentService', () => ({
  lateDocumentService: service,
}))
vi.mock('../services/applicationService', () => ({
  applicationService: { fetchWaves: vi.fn() },
}))
vi.mock('../services/documentTypeService', () => ({
  documentTypeService: {
    fetchAll: vi.fn().mockResolvedValue({ types: [] }),
  },
}))
vi.mock('../components/FilePreviewDialog.vue', () => ({
  default: {
    props: ['open', 'file'],
    template:
      '<div data-test="preview" :data-open="String(open)" :data-file="file?.id" />',
  },
}))

const access = vi.hoisted(() => ({ granted: new Set<string>() }))
vi.mock('@/features/platform/auth', () => ({
  useRoleGuard: () => ({
    can: (...permissions: string[]) =>
      permissions.some((p) => access.granted.has(p)),
  }),
}))

const passthrough = { template: '<div><slot /></div>' }
const ALL = [
  'admission-late-documents.read',
  'admission-late-documents.upload',
  'admission-late-documents.verify',
]

const base = {
  applicationId: 'app1',
  registrationNumber: 'PSB-001',
  applicantName: 'Ahmad Fauzi',
  applicationStatus: 'ENROLLED',
  waveName: 'Gelombang 1',
  gradeLevel: 7,
  documentTypeId: 'ijazah',
  documentTypeName: 'Ijazah SD',
  documentId: null,
  fileId: null,
  fileName: null,
  fileMimeType: null,
  state: 'MISSING',
  urgency: 'ON_TIME',
  limitDate: '2026-12-31T16:59:59.000Z',
  note: null,
}
const pending = {
  ...base,
  applicationId: 'app2',
  registrationNumber: 'PSB-002',
  applicantName: 'Siti Aminah',
  documentId: 'doc2',
  fileId: 'file2',
  fileName: 'ijazah.pdf',
  fileMimeType: 'application/pdf',
  state: 'PENDING',
}

function page(rows: unknown[], extra: Record<string, unknown> = {}) {
  return {
    rows,
    total: rows.length,
    year: { id: 'y1', name: '2027/2028' },
    datesMissing: [],
    counts: { onTime: 3, late: 2, overdue: 1, complete: 5 },
    ...extra,
  }
}

function mountView() {
  return mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(LateDocumentListView)),
    }),
    {
      attachTo: document.body,
      global: {
        stubs: {
          Dialog: passthrough,
          DialogContent: passthrough,
          DialogHeader: passthrough,
          DialogTitle: passthrough,
          DialogDescription: passthrough,
          DialogFooter: passthrough,
        },
      },
    },
  ).findComponent(LateDocumentListView)
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  access.granted = new Set(ALL)
  service.fetchList.mockResolvedValue(page([base, pending]))
})

const rowButton = (row: ReturnType<typeof cardRow>, label: string) =>
  row.findAll('button').find((b) => b.text() === label)

async function can(row: ReturnType<typeof cardRow>, label: string) {
  if (rowButton(row, label)) return true
  if (!row.findAll('button').some((b) => b.text().includes('Opsi')))
    return false
  await openRowMenu(row)
  return menuLabels().includes(label)
}

async function act(row: ReturnType<typeof cardRow>, label: string) {
  const direct = rowButton(row, label)
  if (direct) await direct.trigger('click')
  else await chooseRowAction(row, label)
}

it('shows the four counts and the year', async () => {
  const wrapper = mountView()
  await flushPromises()

  expect(wrapper.text()).toContain('2027/2028')
  expect(wrapper.get('[data-test="count-onTime"]').text()).toContain('3')
  expect(wrapper.get('[data-test="count-late"]').text()).toContain('2')
  expect(wrapper.get('[data-test="count-overdue"]').text()).toContain('1')
  expect(wrapper.get('[data-test="count-complete"]').text()).toContain('5')
})

it('loads ten rows with the OPEN filter by default', async () => {
  mountView()
  await flushPromises()

  expect(service.fetchList).toHaveBeenCalledWith(
    expect.objectContaining({ page: 1, limit: 10, state: 'OPEN' }),
  )
})

it('asks the server for the next page', async () => {
  service.fetchList.mockResolvedValue(page([base, pending], { total: 25 }))
  const wrapper = mountView()
  await flushPromises()

  await nextCardPage(wrapper).trigger('click')
  await flushPromises()

  expect(service.fetchList).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 2 }),
  )
})

it('keeps every action enabled on LATE and OVERDUE rows', async () => {
  service.fetchList.mockResolvedValue(
    page([
      { ...base, urgency: 'LATE' },
      { ...pending, urgency: 'OVERDUE' },
    ]),
  )
  const wrapper = mountView()
  await flushPromises()

  expect(
    rowButton(cardRow(wrapper, 0), 'Unggah')?.attributes('disabled'),
  ).toBeUndefined()
  expect(
    rowButton(cardRow(wrapper, 1), 'Periksa')?.attributes('disabled'),
  ).toBeUndefined()
})

it('shows Unggah only with the upload permission and Periksa only with the verify permission', async () => {
  access.granted = new Set(['admission-late-documents.read'])
  let wrapper = mountView()
  await flushPromises()
  expect(await can(cardRow(wrapper, 0), 'Unggah')).toBe(false)
  expect(await can(cardRow(wrapper, 1), 'Periksa')).toBe(false)

  access.granted = new Set(['admission-late-documents.upload'])
  wrapper = mountView()
  await flushPromises()
  expect(await can(cardRow(wrapper, 0), 'Unggah')).toBe(true)
  expect(await can(cardRow(wrapper, 1), 'Periksa')).toBe(false)

  access.granted = new Set(['admission-late-documents.verify'])
  wrapper = mountView()
  await flushPromises()
  expect(await can(cardRow(wrapper, 0), 'Unggah')).toBe(false)
  expect(await can(cardRow(wrapper, 1), 'Periksa')).toBe(true)
})

it('upload sends the file and reloads the page', async () => {
  service.upload.mockResolvedValue({ success: true })
  const wrapper = mountView()
  await flushPromises()

  await act(cardRow(wrapper, 0), 'Unggah')
  const input = wrapper.get('input[type="file"]')
  const file = new File(['x'], 'ijazah.pdf', { type: 'application/pdf' })
  Object.defineProperty(input.element, 'files', { value: [file] })
  await input.trigger('change')
  await wrapper.get('[data-test="upload-form"]').trigger('submit')
  await flushPromises()

  expect(service.upload).toHaveBeenCalledWith('app1', 'ijazah', file)
  expect(service.fetchList).toHaveBeenCalledTimes(2)
})

it('approve and reject (reason required) reload the page', async () => {
  service.decide.mockResolvedValue({ success: true })
  const wrapper = mountView()
  await flushPromises()

  await act(cardRow(wrapper, 1), 'Periksa')
  await wrapper.get('[data-test="reject"]').trigger('click')
  await flushPromises()
  expect(service.decide).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('Alasan wajib diisi')

  await wrapper.get('[data-test="approve"]').trigger('click')
  await flushPromises()
  expect(service.decide).toHaveBeenCalledWith(
    'app2',
    'doc2',
    'APPROVED',
    undefined,
  )
  expect(service.fetchList).toHaveBeenCalledTimes(2)

  await act(cardRow(wrapper, 1), 'Periksa')
  await wrapper.get('textarea').setValue('Buram')
  await wrapper.get('[data-test="reject"]').trigger('click')
  await flushPromises()
  expect(service.decide).toHaveBeenLastCalledWith(
    'app2',
    'doc2',
    'REJECTED',
    'Buram',
  )
})

it('shows the missing-dates notice', async () => {
  service.fetchList.mockResolvedValue(page([base], { datesMissing: ['start'] }))
  const wrapper = mountView()
  await flushPromises()

  expect(wrapper.text()).toContain(
    'Tanggal awal semester belum diisi di Akademik, penanda warna belum tersedia',
  )
})

it('shows an error with a retry button instead of an empty list', async () => {
  service.fetchList.mockResolvedValueOnce({
    error: 'Gagal memuat berkas susulan.',
  })
  const wrapper = mountView()
  await flushPromises()

  expect(wrapper.get('[role="alert"]').text()).toContain('Gagal memuat')
  expect(wrapper.text()).not.toContain('Tidak ada berkas susulan')
  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Coba lagi')!
    .trigger('click')
  await flushPromises()
  expect(service.fetchList).toHaveBeenCalledTimes(2)
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
})

it('opens the file of a row in the preview', async () => {
  const wrapper = mountView()
  await flushPromises()

  await act(cardRow(wrapper, 1), 'Lihat berkas')
  expect(wrapper.get('[data-test="preview"]').attributes('data-file')).toBe(
    'file2',
  )
})

it('goes back to page 1 when a filter changes', async () => {
  const wrapper = mountView()
  await flushPromises()
  const search = wrapper.get('input[type="search"], input[type="text"]')

  await search.setValue('Siti')
  await new Promise((resolve) => setTimeout(resolve, 400))
  await flushPromises()

  expect(service.fetchList).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 1, search: 'Siti' }),
  )
})

it('marks an OVERDUE row without a limit date on the desktop table', async () => {
  service.fetchList.mockResolvedValue(
    page([{ ...base, urgency: 'OVERDUE', limitDate: null }]),
  )
  const wrapper = mountView()
  await flushPromises()

  const table = wrapper.get('table')
  expect(table.text()).toContain('Lewat akhir semester')
  expect(table.html()).toContain('destructive')
})

it('names the missing date in the notice', async () => {
  service.fetchList.mockResolvedValue(page([base], { datesMissing: ['end'] }))
  const wrapper = mountView()
  await flushPromises()

  expect(wrapper.text()).toContain('Tanggal akhir semester belum diisi')
})

it('shows no action for a read-only user', async () => {
  access.granted = new Set(['admission-late-documents.read'])
  const wrapper = mountView()
  await flushPromises()

  expect(wrapper.get('table').findAll('tbody button')).toHaveLength(1)
})
