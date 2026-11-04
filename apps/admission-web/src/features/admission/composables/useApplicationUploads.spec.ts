import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import type { PaymentForm } from './useApplicationFormState'
import { useApplicationUploads } from './useApplicationUploads'

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function makeFile(name = 'doc.pdf'): File {
  return new File(['content'], name, { type: 'application/pdf' })
}

function makeChangeEvent(file: File | null): Event {
  return { target: { files: file ? [file] : [] } } as unknown as Event
}

function makeFileOfSize(bytes: number): File {
  return new File([new Uint8Array(bytes)], 'scan.pdf', {
    type: 'application/pdf',
  })
}

const FIVE_MB = 5 * 1024 * 1024

describe('useApplicationUploads size limit', () => {
  const payment = ref<PaymentForm>({
    bankAccountId: 'acc-1',
    bankName: '',
    senderAccountName: '',
    transferDate: '',
  })

  beforeEach(() => vi.clearAllMocks())

  it('refuses a document over 5 MB, the limit the service enforces', () => {
    const { documentFiles, onDocumentFileChange } = useApplicationUploads({
      payment,
      uploadDocumentReq: vi.fn(),
      uploadPaymentProofReq: vi.fn(),
      refresh: vi.fn(),
    })

    onDocumentFileChange('KTP', makeChangeEvent(makeFileOfSize(FIVE_MB + 1)))

    expect(documentFiles.value.KTP).toBeNull()
    expect(toast.error).toHaveBeenCalledWith(
      'Ukuran berkas melebihi batas maksimal 5 MB.',
    )
  })

  it('keeps a payment proof of exactly 5 MB', () => {
    const { paymentFile, onPaymentFileChange } = useApplicationUploads({
      payment,
      uploadDocumentReq: vi.fn(),
      uploadPaymentProofReq: vi.fn(),
      refresh: vi.fn(),
    })

    const file = makeFileOfSize(FIVE_MB)
    onPaymentFileChange(makeChangeEvent(file))

    expect(paymentFile.value).toBe(file)
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe('useApplicationUploads', () => {
  const payment = ref<PaymentForm>({
    bankAccountId: 'acc-1',
    bankName: '',
    senderAccountName: '',
    transferDate: '',
  })

  beforeEach(() => {
    vi.clearAllMocks()
    payment.value = {
      bankAccountId: '',
      bankName: '',
      senderAccountName: '',
      transferDate: '',
    }
  })

  describe('document upload', () => {
    it('serializes document uploads and keeps the other selected file for retry', async () => {
      let finish!: (result: { success: boolean }) => void
      const uploadDocumentReq = vi.fn(
        () =>
          new Promise<{ success: boolean }>((resolve) => {
            finish = resolve
          }),
      )
      const uploads = useApplicationUploads({
        payment,
        uploadDocumentReq,
        uploadPaymentProofReq: vi.fn(),
        refresh: vi.fn(),
      })
      uploads.onDocumentFileChange('KTP', makeChangeEvent(makeFile('ktp.pdf')))
      uploads.onDocumentFileChange('KK', makeChangeEvent(makeFile('kk.pdf')))
      const pending = uploads.uploadDocument('KTP')
      const ignored = uploads.uploadDocument('KK')
      expect(uploadDocumentReq).toHaveBeenCalledTimes(1)
      await ignored
      expect(uploads.uploadingDoc.value).toBe('KTP')
      expect(uploads.documentFiles.value.KK?.name).toBe('kk.pdf')
      finish({ success: false })
      await pending
      expect(uploads.uploadingDoc.value).toBeNull()
      const retry = uploads.uploadDocument('KK')
      expect(uploadDocumentReq).toHaveBeenCalledTimes(2)
      finish({ success: true })
      await retry
      expect(uploads.documentFiles.value.KK).toBeNull()
    })

    it('releases document busy state if refreshing after upload rejects', async () => {
      const error = new Error('refresh failed')
      const uploads = useApplicationUploads({
        payment,
        uploadDocumentReq: vi.fn().mockResolvedValue({ success: true }),
        uploadPaymentProofReq: vi.fn(),
        refresh: vi.fn().mockRejectedValue(error),
      })
      uploads.onDocumentFileChange('KTP', makeChangeEvent(makeFile()))
      await expect(uploads.uploadDocument('KTP')).rejects.toThrow(error)
      expect(uploads.uploadingDoc.value).toBeNull()
      expect(uploads.documentFiles.value.KTP).not.toBeNull()
    })

    it('onDocumentFileChange stores the selected file by type code', () => {
      const { documentFiles, onDocumentFileChange } = useApplicationUploads({
        payment,
        uploadDocumentReq: vi.fn(),
        uploadPaymentProofReq: vi.fn(),
        refresh: vi.fn(),
      })

      const file = makeFile()
      onDocumentFileChange('KTP', makeChangeEvent(file))

      expect(documentFiles.value.KTP).toBe(file)
    })

    it('errors when uploading without a selected file', async () => {
      const uploadDocumentReq = vi.fn()
      const { uploadDocument } = useApplicationUploads({
        payment,
        uploadDocumentReq,
        uploadPaymentProofReq: vi.fn(),
        refresh: vi.fn(),
      })

      await uploadDocument('KTP')

      expect(uploadDocumentReq).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith('Pilih berkas terlebih dahulu.')
    })

    it('refreshes and clears the file on successful upload', async () => {
      const uploadDocumentReq = vi.fn().mockResolvedValue({ success: true })
      const refresh = vi.fn().mockResolvedValue(undefined)
      const { documentFiles, onDocumentFileChange, uploadDocument } =
        useApplicationUploads({
          payment,
          uploadDocumentReq,
          uploadPaymentProofReq: vi.fn(),
          refresh,
        })

      onDocumentFileChange('KTP', makeChangeEvent(makeFile()))
      await uploadDocument('KTP')

      expect(uploadDocumentReq).toHaveBeenCalledWith('KTP', expect.any(File))
      expect(refresh).toHaveBeenCalled()
      expect(documentFiles.value.KTP).toBeNull()
      expect(toast.success).toHaveBeenCalledWith('Berkas berhasil diunggah.')
    })

    it('keeps the file selected and skips refresh when the upload fails', async () => {
      const uploadDocumentReq = vi.fn().mockResolvedValue({ success: false })
      const refresh = vi.fn()
      const { documentFiles, onDocumentFileChange, uploadDocument } =
        useApplicationUploads({
          payment,
          uploadDocumentReq,
          uploadPaymentProofReq: vi.fn(),
          refresh,
        })

      onDocumentFileChange('KTP', makeChangeEvent(makeFile()))
      await uploadDocument('KTP')

      expect(refresh).not.toHaveBeenCalled()
      expect(documentFiles.value.KTP).not.toBeNull()
    })
  })

  describe('payment proof upload', () => {
    it('releases payment busy state on failed refresh without false success', async () => {
      payment.value = {
        bankAccountId: 'acc-1',
        bankName: 'BSI',
        senderAccountName: 'Contoh',
        transferDate: '',
      }
      const uploads = useApplicationUploads({
        payment,
        uploadDocumentReq: vi.fn(),
        uploadPaymentProofReq: vi.fn().mockResolvedValue({ success: true }),
        refresh: vi.fn().mockRejectedValue(new Error('offline')),
      })
      uploads.onPaymentFileChange(makeChangeEvent(makeFile('proof.pdf')))
      await expect(uploads.uploadPayment()).rejects.toThrow('offline')
      expect(uploads.uploadingPayment.value).toBe(false)
      expect(uploads.paymentFile.value?.name).toBe('proof.pdf')
      expect(toast.success).not.toHaveBeenCalled()
    })
    it('errors when no proof file is selected', async () => {
      payment.value = {
        bankAccountId: 'acc-1',
        bankName: 'BSI',
        senderAccountName: 'Budi',
        transferDate: '',
      }
      const uploadPaymentProofReq = vi.fn()
      const { uploadPayment } = useApplicationUploads({
        payment,
        uploadDocumentReq: vi.fn(),
        uploadPaymentProofReq,
        refresh: vi.fn(),
      })

      await uploadPayment()

      expect(uploadPaymentProofReq).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith('Pilih berkas bukti transfer.')
    })

    it('uploads the proof, refreshes, and clears the file on success', async () => {
      payment.value = {
        bankAccountId: 'acc-1',
        bankName: 'BSI',
        senderAccountName: 'Budi',
        transferDate: '2026-01-05',
      }
      const uploadPaymentProofReq = vi.fn().mockResolvedValue({ success: true })
      const refresh = vi.fn().mockResolvedValue(undefined)
      const { paymentFile, onPaymentFileChange, uploadPayment } =
        useApplicationUploads({
          payment,
          uploadDocumentReq: vi.fn(),
          uploadPaymentProofReq,
          refresh,
        })

      onPaymentFileChange(makeChangeEvent(makeFile('proof.jpg')))
      await uploadPayment()

      expect(uploadPaymentProofReq).toHaveBeenCalledWith(
        {
          bankAccountId: 'acc-1',
          bankName: 'BSI',
          senderAccountName: 'Budi',
          transferDate: '2026-01-05',
        },
        expect.any(File),
      )
      expect(refresh).toHaveBeenCalled()
      expect(paymentFile.value).toBeNull()
      expect(toast.success).toHaveBeenCalledWith(
        'Bukti pembayaran berhasil diunggah.',
      )
    })
  })
})
