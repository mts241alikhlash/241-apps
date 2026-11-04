// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import AddPaymentDialog from './AddPaymentDialog.vue'

const service = vi.hoisted(() => ({ fetchEligible: vi.fn(), add: vi.fn() }))
const loadOptions = vi.hoisted(() => vi.fn())
vi.mock('../services/paymentQueueService', () => ({
  paymentQueueService: service,
}))
vi.mock('../composables/useFormOptions', () => ({
  useFormOptions: () => ({
    load: loadOptions,
    options: ref({
      bankAccounts: [
        {
          id: 'acc1',
          bankName: 'BSI',
          accountNumber: '7123456789',
          accountHolder: 'MTs Al-Ikhlash',
        },
        {
          id: 'acc2',
          bankName: 'BRI',
          accountNumber: '1234567890',
          accountHolder: 'MTs Al-Ikhlash',
        },
      ],
    }),
  }),
}))

const passthrough = { template: '<div><slot /></div>' }
const datePicker = {
  props: ['modelValue', 'maxDate'],
  emits: ['update:modelValue'],
  template:
    '<input name="transferDate" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
}
const applicants = [
  {
    applicationId: 'app1',
    registrationNumber: 'PSB-001',
    applicantName: 'Ahmad Fauzi',
    applicationStatus: 'DRAFT',
    waveName: 'Gelombang 1',
    amount: 150000,
  },
  {
    applicationId: 'app2',
    registrationNumber: 'PSB-002',
    applicantName: 'Siti Aminah',
    applicationStatus: 'SUBMITTED',
    waveName: 'Gelombang 1',
    amount: 150000,
  },
]

function mountDialog(initial: string | null = null) {
  return mount(AddPaymentDialog, {
    props: { open: true, initialApplicationId: initial },
    global: {
      stubs: {
        Dialog: passthrough,
        DialogContent: passthrough,
        DialogHeader: passthrough,
        DialogTitle: passthrough,
        DialogDescription: passthrough,
        DialogFooter: passthrough,
        DatePicker: datePicker,
      },
    },
  })
}

async function fill(wrapper: ReturnType<typeof mountDialog>, withFile = true) {
  await wrapper.get('input[name="bankName"]').setValue('BSI')
  await wrapper.get('input[name="senderAccountName"]').setValue('Budi Santoso')
  await wrapper.get('input[name="transferDate"]').setValue('2026-10-01')
  await wrapper.get('input[value="acc1"]').setValue()
  if (withFile) {
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File(['x'], 'bukti.png', { type: 'image/png' })],
      configurable: true,
    })
    await input.trigger('change')
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  service.fetchEligible.mockResolvedValue(applicants)
})

it('lists eligible applicants and searches them', async () => {
  const wrapper = mountDialog()
  await flushPromises()

  expect(wrapper.text()).toContain('Ahmad Fauzi')
  expect(wrapper.text()).toContain('PSB-002')

  await wrapper.get('input[type="search"]').setValue('siti')
  await vi.waitFor(() =>
    expect(service.fetchEligible).toHaveBeenLastCalledWith('siti'),
  )
})

it('pre-selects the applicant named by the caller', async () => {
  const wrapper = mountDialog('app2')
  await flushPromises()

  expect(
    (wrapper.get('input[value="app2"]').element as HTMLInputElement).checked,
  ).toBe(true)
})

it('shows the amount of the selected applicant instead of asking for it', async () => {
  const wrapper = mountDialog('app1')
  await flushPromises()

  expect(wrapper.text()).toContain('Rp. 150.000')
  expect(wrapper.find('input[name="amount"]').exists()).toBe(false)
})

it('refuses to save without a proof, an applicant or an account', async () => {
  const wrapper = mountDialog()
  await flushPromises()

  await fill(wrapper, false)
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(service.add).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('Pilih berkas bukti transfer')
  expect(wrapper.text()).toContain('Pilih pendaftar')
})

it('sends the payment with its proof and reports it saved', async () => {
  service.add.mockResolvedValue({ success: true })
  const wrapper = mountDialog('app1')
  await flushPromises()

  await fill(wrapper)
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(service.add).toHaveBeenCalledWith(
    {
      applicationId: 'app1',
      bankAccountId: 'acc1',
      bankName: 'BSI',
      senderAccountName: 'Budi Santoso',
      transferDate: '2026-10-01',
    },
    expect.any(File),
  )
  expect(wrapper.emitted('saved')).toHaveLength(1)
})

it('stays open and does not report saved when the server refuses', async () => {
  service.add.mockResolvedValue({ success: false })
  const wrapper = mountDialog('app1')
  await flushPromises()

  await fill(wrapper)
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(wrapper.emitted('saved')).toBeUndefined()
})

it('refuses a file that is not JPG, PNG or PDF', async () => {
  const wrapper = mountDialog('app1')
  await flushPromises()

  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: [new File(['x'], 'bukti.exe', { type: 'application/x-msdownload' })],
    configurable: true,
  })
  await input.trigger('change')

  expect(wrapper.text()).toContain('Format berkas harus JPG, PNG, atau PDF.')
})

it('loads the form options when opened', async () => {
  mountDialog()
  await flushPromises()

  expect(loadOptions).toHaveBeenCalled()
})

it('drops a pre-selected applicant that is not in the loaded list', async () => {
  service.add.mockResolvedValue({ success: true })
  const wrapper = mountDialog('app99')
  await flushPromises()

  await fill(wrapper)
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(service.add).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('Pilih pendaftar')
})

it('refuses a transfer date after today', async () => {
  const wrapper = mountDialog('app1')
  await flushPromises()

  await fill(wrapper)
  await wrapper.get('input[name="transferDate"]').setValue('2999-01-01')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(service.add).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain(
    'Tanggal transfer tidak boleh melewati hari ini',
  )
})

it('refuses a file larger than 5 MB', async () => {
  const wrapper = mountDialog('app1')
  await flushPromises()

  const big = new File(['x'], 'bukti.png', { type: 'image/png' })
  Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 })
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: [big],
    configurable: true,
  })
  await input.trigger('change')

  expect(wrapper.text()).toContain('Ukuran berkas maksimal 5 MB.')
})
