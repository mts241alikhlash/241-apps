// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { TooltipProvider } from '@mts241alikhlash/ui/tooltip'
import PaymentListView from './PaymentListView.vue'
import {
  cardRow,
  cardRows,
  cardsFooter,
  menuLabels,
  openRowMenu,
  chooseRowAction,
  nextCardPage,
} from '@/test/dataTableCards'

const service = vi.hoisted(() => ({
  fetchQueue: vi.fn(),
  verify: vi.fn(),
  reject: vi.fn(),
  cancel: vi.fn(),
}))
vi.mock('../services/paymentQueueService', () => ({
  paymentQueueService: service,
}))
vi.mock('../services/applicationService', () => ({
  applicationService: { fetchWaves: vi.fn() },
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

const route = vi.hoisted(() => ({ query: {} }))
const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}))

const passthrough = { template: '<div><slot /></div>' }
const ALL = [
  'admission-payments.read',
  'admission-payments.verify',
  'admission-payments.create',
]

const pending = {
  paymentId: 'p1',
  applicationId: 'app1',
  registrationNumber: 'PSB-001',
  applicantName: 'Ahmad Fauzi',
  applicationStatus: 'SUBMITTED',
  waveId: 'w1',
  waveName: 'Gelombang 1',
  amount: 150000,
  status: 'PENDING',
  note: null,
  bankName: 'BSI',
  senderAccountName: 'Budi Santoso',
  transferDate: '2026-10-01T00:00:00.000Z',
  bankAccount: {
    id: 'a1',
    bankName: 'BSI',
    accountNumber: '7123456789',
    accountHolder: 'MTs Al-Ikhlash',
  },
  proofFile: {
    id: 'f1',
    originalName: 'bukti.png',
    mimeType: 'image/png',
    storageKey: 'payments/bukti.png',
  },
  proofUploadedByStaff: false,
  verifiedById: null,
  verifiedAt: null,
  updatedAt: '2026-10-02T00:00:00.000Z',
}
const verified = {
  ...pending,
  paymentId: 'p2',
  applicationId: 'app2',
  status: 'VERIFIED',
}

function page(
  rows: unknown[],
  counts = { pending: 1, verified: 1, rejected: 0 },
) {
  return { rows, total: rows.length, counts }
}

function mountView() {
  return mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(PaymentListView)),
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
  ).findComponent(PaymentListView)
}

function tab(wrapper: ReturnType<typeof mountView>, label: string) {
  return wrapper.findAll('[role="tab"]').find((t) => t.text().includes(label))!
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  access.granted = new Set(ALL)
  route.query = {}
  service.fetchQueue.mockResolvedValue(page([pending]))
})

it('shows the pending tab first with the counts of every tab', async () => {
  const wrapper = mountView()
  await flushPromises()

  expect(service.fetchQueue).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'PENDING', page: 1 }),
  )
  expect(tab(wrapper, 'Menunggu').text()).toContain('1')
  expect(tab(wrapper, 'Terverifikasi').text()).toContain('1')
  const row = cardRow(wrapper)
  expect(row.text()).toContain('Ahmad Fauzi')
  expect(row.text()).toContain('PSB-001')
  expect(row.text()).toContain('Gelombang 1')
  expect(row.text()).toContain('Budi Santoso')
  expect(row.find('a').exists()).toBe(false)
  await chooseRowAction(row, 'Lihat bukti')
  expect(wrapper.get('[data-test="preview"]').attributes('data-open')).toBe(
    'true',
  )
  expect(wrapper.get('[data-test="preview"]').attributes('data-file')).toBe(
    'f1',
  )
})

it('loads another status when its tab is opened', async () => {
  const wrapper = mountView()
  await flushPromises()
  service.fetchQueue.mockResolvedValue(page([verified]))

  await tab(wrapper, 'Terverifikasi').trigger('mousedown')
  await flushPromises()

  expect(service.fetchQueue).toHaveBeenLastCalledWith(
    expect.objectContaining({ status: 'VERIFIED', page: 1 }),
  )
})

it('verifies a pending payment and reloads', async () => {
  service.verify.mockResolvedValue({ success: true })
  const wrapper = mountView()
  await flushPromises()

  await chooseRowAction(cardRow(wrapper), 'Verifikasi')
  await flushPromises()

  expect(service.verify).toHaveBeenCalledWith('app1')
  expect(service.fetchQueue).toHaveBeenCalledTimes(2)
})

it('rejects only with a reason', async () => {
  service.reject.mockResolvedValue({ success: true })
  const wrapper = mountView()
  await flushPromises()

  await chooseRowAction(cardRow(wrapper), 'Tolak')
  await wrapper.get('[data-test="reason-form"]').trigger('submit')
  await flushPromises()
  expect(service.reject).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('Alasan wajib diisi')

  await wrapper.get('textarea').setValue('Nominal tidak sesuai')
  await wrapper.get('[data-test="reason-form"]').trigger('submit')
  await flushPromises()

  expect(service.reject).toHaveBeenCalledWith('app1', 'Nominal tidak sesuai')
  expect(service.fetchQueue).toHaveBeenCalledTimes(2)
})

it('cancels a verification only with a reason, and only from the verified tab', async () => {
  service.cancel.mockResolvedValue({ success: true })
  const wrapper = mountView()
  await flushPromises()
  expect(wrapper.text()).not.toContain('Batalkan verifikasi')

  service.fetchQueue.mockResolvedValue(page([verified]))
  await tab(wrapper, 'Terverifikasi').trigger('mousedown')
  await flushPromises()
  await chooseRowAction(cardRow(wrapper), 'Batalkan verifikasi')
  await wrapper.get('textarea').setValue('Salah nominal')
  await wrapper.get('[data-test="reason-form"]').trigger('submit')
  await flushPromises()

  expect(service.cancel).toHaveBeenCalledWith('app2', 'Salah nominal')
})

it('keeps the dialog open and the list unchanged when the action is refused', async () => {
  service.reject.mockResolvedValue({ success: false })
  const wrapper = mountView()
  await flushPromises()

  await chooseRowAction(cardRow(wrapper), 'Tolak')
  await wrapper.get('textarea').setValue('x')
  await wrapper.get('[data-test="reason-form"]').trigger('submit')
  await flushPromises()

  expect(service.fetchQueue).toHaveBeenCalledTimes(1)
  expect(wrapper.find('[data-test="reason-form"]').exists()).toBe(true)
})

it('shows no action buttons and no add button without the verify and create permissions', async () => {
  access.granted = new Set(['admission-payments.read'])
  const wrapper = mountView()
  await flushPromises()

  const row = cardRow(wrapper)
  await openRowMenu(row)
  expect(menuLabels()).toEqual(['Lihat bukti'])
  expect(
    wrapper.findAll('button').filter((b) => b.text() === 'Tambah'),
  ).toHaveLength(0)
})

it('shows an empty message and a retry on a load error', async () => {
  service.fetchQueue.mockResolvedValue({ error: 'Gagal memuat pembayaran.' })
  const wrapper = mountView()
  await flushPromises()

  expect(wrapper.text()).toContain('Gagal memuat pembayaran.')
  service.fetchQueue.mockResolvedValue(
    page([], { pending: 0, verified: 0, rejected: 0 }),
  )
  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Coba lagi')!
    .trigger('click')
  await flushPromises()

  expect(wrapper.text()).toContain('Tidak ada pembayaran')
})

it('goes to the add page for the applicant named in the address', async () => {
  route.query = { applicationId: 'app9' }
  mountView()
  await flushPromises()

  expect(router.push).toHaveBeenCalledWith({
    name: 'admin-payment-new',
    query: { applicationId: 'app9' },
  })
})

it('goes to the add page from the header button', async () => {
  const wrapper = mountView()
  await flushPromises()
  expect(router.push).not.toHaveBeenCalled()

  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Tambah')!
    .trigger('click')

  expect(router.push).toHaveBeenCalledWith({
    name: 'admin-payment-new',
    query: undefined,
  })
})

it('does not go to the add page without the create permission', async () => {
  access.granted = new Set(['admission-payments.read'])
  route.query = { applicationId: 'app9' }
  mountView()
  await flushPromises()

  expect(router.push).not.toHaveBeenCalled()
})

it('ignores a slow response from a tab that is no longer shown', async () => {
  let release: (value: unknown) => void = () => undefined
  service.fetchQueue.mockReturnValueOnce(
    new Promise((resolve) => (release = resolve)),
  )
  const wrapper = mountView()
  await flushPromises()

  service.fetchQueue.mockResolvedValue(page([verified]))
  await tab(wrapper, 'Terverifikasi').trigger('mousedown')
  await flushPromises()
  release(page([pending]))
  await flushPromises()

  const rows = cardRows(wrapper)
  expect(rows).toHaveLength(1)
  expect(rows[0].text()).toContain('Terverifikasi')
})

it('uses the underlined tab style', async () => {
  const wrapper = mountView()
  await flushPromises()

  const list = wrapper.get('[data-slot="tabs-list"]')
  expect(list.classes()).toContain('border-b')
  expect(list.classes()).not.toContain('bg-muted')
})

it('renders DataTable with expected columns and without numbering column', async () => {
  const wrapper = mountView()
  await flushPromises()

  const dataTable = wrapper.findComponent({ name: 'DataTable' })
  expect(dataTable.exists()).toBe(true)
  const columns = dataTable.props('columns') as { header?: string }[]
  const headers = columns.map((c) => c.header)
  expect(headers).not.toContain('No')
  expect(headers).toEqual([
    'No. Pendaftaran',
    'Nama Pendaftar',
    'Gelombang',
    'Status',
    'Jumlah',
    'Pengirim',
    'Tanggal',
    'Aksi',
  ])
})

it('asks the server for ten rows at a time', async () => {
  mountView()
  await flushPromises()

  expect(service.fetchQueue).toHaveBeenCalledWith(
    expect.objectContaining({ page: 1, limit: 10 }),
  )
})

it('loads the next page from the server and replaces the rows', async () => {
  service.fetchQueue.mockResolvedValue({
    ...page([pending]),
    total: 25,
  })
  const wrapper = mountView()
  await flushPromises()
  expect(cardsFooter(wrapper).text()).toContain('dari 25 pembayaran')

  service.fetchQueue.mockResolvedValue({
    ...page([{ ...pending, paymentId: 'p9', applicantName: 'Siti Aminah' }]),
    total: 25,
  })
  await nextCardPage(wrapper).trigger('click')
  await flushPromises()

  expect(service.fetchQueue).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 2, limit: 10 }),
  )
  expect(wrapper.text()).toContain('Siti Aminah')
  expect(wrapper.text()).not.toContain('Ahmad Fauzi')
})

it('goes back to the first page when another tab is opened', async () => {
  service.fetchQueue.mockResolvedValue({ ...page([pending]), total: 25 })
  const wrapper = mountView()
  await flushPromises()
  await nextCardPage(wrapper).trigger('click')
  await flushPromises()

  await tab(wrapper, 'Terverifikasi').trigger('mousedown')
  await flushPromises()

  expect(service.fetchQueue).toHaveBeenLastCalledWith(
    expect.objectContaining({ status: 'VERIFIED', page: 1 }),
  )
})

it('steps back to the last page when the current one is gone', async () => {
  service.fetchQueue.mockResolvedValueOnce({ ...page([pending]), total: 11 })
  const wrapper = mountView()
  await flushPromises()
  await nextCardPage(wrapper).trigger('click')
  service.fetchQueue.mockResolvedValueOnce({ ...page([]), total: 10 })
  service.fetchQueue.mockResolvedValueOnce({ ...page([pending]), total: 10 })
  await flushPromises()

  expect(service.fetchQueue).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 1 }),
  )
})
