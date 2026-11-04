import { ref, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import type { PaymentForm } from './useApplicationFormState'

interface PaymentProofPayload {
  bankName: string
  bankAccountId: string
  senderAccountName: string
  transferDate?: string
}

export interface UseApplicationUploadsOptions {
  payment: Ref<PaymentForm>
  uploadDocumentReq: (
    typeCode: string,
    file: File,
  ) => Promise<{ success: boolean }>
  uploadPaymentProofReq: (
    payload: PaymentProofPayload,
    file: File,
  ) => Promise<{ success: boolean }>
  refresh: () => Promise<void>
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024

export function useApplicationUploads(options: UseApplicationUploadsOptions) {
  const documentFiles = ref<Record<string, File | null>>({})
  const uploadingDoc = ref<string | null>(null)

  function onDocumentFileChange(typeCode: string, event: Event) {
    if (uploadingDoc.value) return
    const input = event.target as HTMLInputElement
    const selected = input.files?.[0] ?? null
    if (
      selected &&
      !['image/jpeg', 'image/png', 'application/pdf'].includes(selected.type)
    ) {
      toast.error('Format berkas harus JPG, PNG, atau PDF.')
      input.value = ''
      documentFiles.value[typeCode] = null
      return
    }
    if (selected && selected.size > MAX_FILE_SIZE) {
      toast.error('Ukuran berkas melebihi batas maksimal 5 MB.')
      input.value = ''
      documentFiles.value[typeCode] = null
      return
    }
    documentFiles.value[typeCode] = selected
  }

  function clearDocumentFile(typeCode: string) {
    documentFiles.value[typeCode] = null
  }

  async function uploadDocument(typeCode: string): Promise<boolean> {
    if (uploadingDoc.value) return false
    const file = documentFiles.value[typeCode]
    if (!file) {
      toast.error('Pilih berkas terlebih dahulu.')
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Ukuran berkas melebihi batas maksimal 5 MB.')
      return false
    }
    uploadingDoc.value = typeCode
    try {
      const result = await options.uploadDocumentReq(typeCode, file)
      if (result.success) {
        await options.refresh()
        documentFiles.value[typeCode] = null
        toast.success('Berkas berhasil diunggah.')
      }
      return result.success
    } finally {
      uploadingDoc.value = null
    }
  }

  const paymentFile = ref<File | null>(null)
  const uploadingPayment = ref(false)

  function onPaymentFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const selected = input.files?.[0] ?? null
    if (selected && selected.size > MAX_FILE_SIZE) {
      toast.error('Ukuran berkas melebihi batas maksimal 5 MB.')
      input.value = ''
      paymentFile.value = null
      return
    }
    paymentFile.value = selected
  }

  async function uploadPayment() {
    if (uploadingPayment.value) return
    if (!paymentFile.value) {
      toast.error('Pilih berkas bukti transfer.')
      return
    }
    if (paymentFile.value.size > MAX_FILE_SIZE) {
      toast.error('Ukuran berkas melebihi batas maksimal 5 MB.')
      return
    }
    uploadingPayment.value = true
    try {
      const result = await options.uploadPaymentProofReq(
        {
          bankName: options.payment.value.bankName,
          bankAccountId: options.payment.value.bankAccountId,
          senderAccountName: options.payment.value.senderAccountName,
          transferDate: options.payment.value.transferDate || undefined,
        },
        paymentFile.value,
      )
      if (result.success) {
        await options.refresh()
        paymentFile.value = null
        toast.success('Bukti pembayaran berhasil diunggah.')
      }
    } finally {
      uploadingPayment.value = false
    }
  }

  return {
    documentFiles,
    uploadingDoc,
    onDocumentFileChange,
    clearDocumentFile,
    uploadDocument,
    paymentFile,
    uploadingPayment,
    onPaymentFileChange,
    uploadPayment,
  }
}
