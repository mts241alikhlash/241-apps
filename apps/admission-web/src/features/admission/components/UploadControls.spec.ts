// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { expect, it, vi } from 'vitest'
import { TooltipProvider } from '@mts241alikhlash/ui/tooltip'
import DocumentsStep from './DocumentsStep.vue'
import PaymentStep from './PaymentStep.vue'
import { useFormOptions } from '../composables/useFormOptions'

function mountDocuments(props: Record<string, unknown>) {
  return mount(
    defineComponent({
      setup: () => () =>
        h(TooltipProvider, null, () =>
          h(DocumentsStep, {
            documentTypes: [],
            documents: [],
            documentFiles: {},
            uploadingDoc: null,
            editable: true,
            onFileChange: vi.fn(),
            onClearFile: vi.fn(),
            onUpload: vi.fn(),
            ...props,
          }),
        ),
    }),
  )
}

it('marks required documents and shows each status with the reviewer note', async () => {
  const wrapper = mountDocuments({
    documentTypes: [
      {
        id: 'kk',
        code: 'KK',
        name: 'Kartu Keluarga',
        requirement: 'REQUIRED',
        lateDueMonths: null,
        isRequired: true,
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 'rapor',
        code: 'RAPOR',
        name: 'Rapor',
        requirement: 'OPTIONAL',
        lateDueMonths: null,
        isRequired: false,
        isActive: true,
        sortOrder: 2,
      },
    ],
    documents: [
      {
        id: 'd1',
        documentTypeId: 'kk',
        status: 'REJECTED',
        note: 'Foto buram',
        file: { originalName: 'kk.jpg' },
      },
    ],
  })
  await flushPromises()

  expect(wrapper.text()).toContain('Ditolak')
  expect(wrapper.text()).toContain('Status:Ditolak. Foto buram')
  expect(wrapper.text()).not.toContain('Catatan:')
  expect(wrapper.text()).toContain('Belum diunggah')
  expect(wrapper.findAll('tbody [aria-label="wajib"]')).toHaveLength(1)
})

it('explains when there are no document types yet', () => {
  expect(mountDocuments({}).text()).toContain('Belum ada jenis berkas')
})

it('links every payment field to its visible label', () => {
  const wrapper = mount(PaymentStep, {
    props: {
      modelValue: {
        bankAccountId: '',
        bankName: '',
        senderAccountName: '',
        transferDate: '',
      },
      applicationPayment: null,
      editable: true,
      paymentFile: null,
      uploadingPayment: false,
      onFileChange: vi.fn(),
      onUpload: vi.fn(),
    },
  })
  for (const input of wrapper.findAll('input:not([type="file"])')) {
    expect(input.attributes('id')).toBeTruthy()
    expect(
      wrapper.find(`label[for="${input.attributes('id')}"]`).exists(),
    ).toBe(true)
  }
  wrapper.unmount()
})

it('copies an account without selecting its radio option', async () => {
  useFormOptions().options.value = {
    bankAccounts: [
      {
        id: 'acc-1',
        bankName: 'BSI',
        accountNumber: '7123456789',
        accountHolder: 'MTs',
      },
    ],
  } as never
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
  const wrapper = mount(PaymentStep, {
    props: {
      modelValue: {
        bankAccountId: '',
        bankName: '',
        senderAccountName: '',
        transferDate: '',
      },
      applicationPayment: null,
      editable: true,
      paymentFile: null,
      uploadingPayment: false,
      onFileChange: vi.fn(),
      onUpload: vi.fn(),
    },
  })
  await wrapper
    .get('button[aria-label="Salin nomor rekening BSI"]')
    .trigger('click')
  await flushPromises()
  expect(writeText).toHaveBeenCalledWith('7123456789')
  expect(wrapper.find('label button').exists()).toBe(false)
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(
    wrapper.get<HTMLInputElement>('input[type="radio"]').element.checked,
  ).toBe(false)
  wrapper.unmount()
  useFormOptions().options.value = null
})

it('shows payment errors under their fields and uploads only a valid form', async () => {
  useFormOptions().options.value = {
    bankAccounts: [
      {
        id: 'acc-1',
        bankName: 'BSI',
        accountNumber: '7123456789',
        accountHolder: 'MTs Al-Ikhlash',
      },
    ],
  } as never
  const onUpload = vi.fn()
  const wrapper = mount(PaymentStep, {
    props: {
      modelValue: {
        bankAccountId: '',
        bankName: '',
        senderAccountName: '',
        transferDate: '',
      },
      applicationPayment: null,
      editable: true,
      paymentFile: null,
      uploadingPayment: false,
      onFileChange: vi.fn(),
      onUpload,
    },
  })
  const button = wrapper
    .findAll('button')
    .find((item) => item.text() === 'Unggah')!

  await button.trigger('click')
  await flushPromises()
  await vi.waitFor(() =>
    expect(wrapper.text()).toContain('Tanggal transfer wajib diisi'),
  )
  expect(wrapper.text()).toContain('Pilih rekening tujuan transfer')
  expect(wrapper.text()).toContain('Pilih berkas bukti transfer.')
  expect(onUpload).not.toHaveBeenCalled()

  await wrapper.setProps({
    paymentFile: new File(['x'], 'bukti.pdf', { type: 'application/pdf' }),
  })
  await wrapper.setProps({
    modelValue: {
      bankAccountId: 'acc-1',
      bankName: 'BSI',
      senderAccountName: 'Budi',
      transferDate: new Date().toISOString().slice(0, 10),
    },
  })
  await button.trigger('click')
  await flushPromises()
  await vi.waitFor(() => expect(onUpload).toHaveBeenCalled())
  wrapper.unmount()
  useFormOptions().options.value = null
})

it('drops the chosen proof when a file of the wrong type replaces it', async () => {
  const onFileChange = vi.fn(
    (event: Event) => (event.target as HTMLInputElement).files?.length ?? 0,
  )
  const wrapper = mount(PaymentStep, {
    props: {
      modelValue: {
        bankAccountId: '',
        bankName: '',
        senderAccountName: '',
        transferDate: '',
      },
      applicationPayment: null,
      editable: true,
      paymentFile: new File(['x'], 'lama.pdf', { type: 'application/pdf' }),
      uploadingPayment: false,
      onFileChange,
      onUpload: vi.fn(),
    },
  })
  const input = wrapper.get<HTMLInputElement>('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: [new File(['x'], 'catatan.txt', { type: 'text/plain' })],
    configurable: true,
  })
  await input.trigger('change')

  expect(wrapper.text()).toContain('Format berkas harus JPG, PNG, atau PDF.')
  expect(onFileChange).toHaveBeenCalledTimes(1)
})

it('replaces the proof upload with a notice while the wave is full', () => {
  const wrapper = mount(PaymentStep, {
    props: {
      modelValue: {
        bankAccountId: '',
        bankName: '',
        senderAccountName: '',
        transferDate: '',
      },
      applicationPayment: null,
      editable: true,
      waveFull: true,
      paymentFile: null,
      uploadingPayment: false,
      onFileChange: vi.fn(),
      onUpload: vi.fn(),
    },
  })
  expect(wrapper.text()).toContain('Gelombang ini sudah penuh')
  expect(wrapper.find('input[type="file"]').exists()).toBe(false)
  wrapper.unmount()
})

const submitted = {
  id: 'pay1',
  status: 'REJECTED',
  amount: 150000,
  note: 'Nominal kurang',
  bankName: 'BSI',
  senderAccountName: 'Budi',
  transferDate: '2026-10-10',
  bankAccount: {
    id: 'acc-1',
    bankName: 'BRI',
    accountNumber: '123',
    accountHolder: 'MTs Al-Ikhlash',
  },
  proofFile: { id: 'f1', originalName: 'bukti.jpg', mimeType: 'image/jpeg' },
}

function mountPayment(extra: Record<string, unknown> = {}) {
  return mount(PaymentStep, {
    props: {
      modelValue: {
        bankAccountId: '',
        bankName: '',
        senderAccountName: '',
        transferDate: '',
      },
      applicationPayment: submitted,
      editable: true,
      paymentFile: null,
      uploadingPayment: false,
      onFileChange: vi.fn(),
      onUpload: vi.fn(),
      ...extra,
    } as never,
  })
}

it('lists the payment as label and value without a badge or a copy button for the amount', () => {
  const wrapper = mountPayment()

  const info = wrapper.get('dl').text()
  expect(info).toContain('Biaya:')
  expect(info).toContain('150.000')
  expect(info).toContain('Status:Ditolak')
  expect(info).toContain('Catatan:Nominal kurang')
  expect(info).toContain('Rekening tujuan:BRI 123 a.n. MTs Al-Ikhlash')
  expect(info).toContain('Pengirim:BSI a.n. Budi')
  expect(wrapper.find('dl [data-slot="badge"]').exists()).toBe(false)
  expect(wrapper.find('[aria-label="Salin nominal"]').exists()).toBe(false)
  wrapper.unmount()
})

it('opens the proof from the file name when a preview handler is given', async () => {
  const onPreview = vi.fn()
  const wrapper = mountPayment({ onPreview })

  const open = wrapper.get('[data-test="open-file"]')
  expect(open.text()).toContain('bukti.jpg')
  expect(open.find('svg').exists()).toBe(true)
  await open.trigger('click')
  expect(onPreview).toHaveBeenCalledWith(submitted.proofFile)
  wrapper.unmount()
})

it('shows only the file name as text without a preview handler', () => {
  const wrapper = mountPayment()

  expect(wrapper.find('[data-test="open-file"]').exists()).toBe(false)
  expect(wrapper.get('[data-test="uploaded-proof"]').text()).toBe('bukti.jpg')
  wrapper.unmount()
})

it('uses the shared drop area for the proof and no card around the form', () => {
  const wrapper = mountPayment()

  expect(wrapper.find('[data-slot="file-dropzone"]').exists()).toBe(true)
  expect(wrapper.find('[data-slot="card"]').exists()).toBe(false)
  wrapper.unmount()
})
