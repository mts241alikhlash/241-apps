// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AddPaymentView from './AddPaymentView.vue'

const service = vi.hoisted(() => ({
  fetchEligible: vi.fn(),
  add: vi.fn(),
}))
vi.mock('../services/paymentQueueService', () => ({
  paymentQueueService: service,
}))

vi.mock('../composables/useFormOptions', () => ({
  useFormOptions: () => ({
    options: { value: { bankAccounts: [] } },
    load: vi.fn(),
  }),
}))

const route = vi.hoisted(() => ({ query: {} }))
const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}))

function mountView() {
  return mount(AddPaymentView, { attachTo: document.body })
}

function button(wrapper: ReturnType<typeof mountView>, text: string) {
  return wrapper.findAll('button').find((b) => b.text().includes(text))!
}

beforeEach(() => {
  vi.clearAllMocks()
  route.query = {}
  service.fetchEligible.mockResolvedValue([])
})

it('loads the applicants who can still pay when it opens', async () => {
  mountView()
  await flushPromises()

  expect(service.fetchEligible).toHaveBeenCalledWith('')
})

it('names every missing field and saves nothing', async () => {
  const wrapper = mountView()
  await flushPromises()

  await button(wrapper, 'Simpan Pembayaran').trigger('click')
  await flushPromises()

  const text = wrapper.text()
  expect(text).toContain('Pilih pendaftar')
  expect(text).toContain('Pilih rekening tujuan transfer')
  expect(text).toContain('Nama bank wajib diisi')
  expect(text).toContain('Nama pengirim wajib diisi')
  expect(text).toContain('Tanggal transfer wajib diisi')
  expect(text).toContain('Pilih berkas bukti transfer')
  expect(service.add).not.toHaveBeenCalled()
  expect(router.push).not.toHaveBeenCalled()
})

it('refuses a proof file that is not JPG, PNG or PDF', async () => {
  const wrapper = mountView()
  await flushPromises()
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: [new File(['x'], 'bukti.txt', { type: 'text/plain' })],
    configurable: true,
  })

  await input.trigger('change')

  expect(wrapper.text()).toContain('Format berkas harus JPG, PNG, atau PDF.')
})

it('refuses a proof file larger than 5 MB', async () => {
  const wrapper = mountView()
  await flushPromises()
  const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'bukti.png', {
    type: 'image/png',
  })
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: [big],
    configurable: true,
  })

  await input.trigger('change')

  expect(wrapper.text()).toContain('Ukuran berkas maksimal 5 MB.')
})

it('goes back to the payment list when cancelled', async () => {
  const wrapper = mountView()
  await flushPromises()

  await button(wrapper, 'Batal').trigger('click')

  expect(router.push).toHaveBeenCalledWith('/admin/payments')
})
