import { toast } from 'vue-sonner'
import { admissionApi } from '../api/admissionApi'
import type {
  AddPaymentPayload,
  AdmissionEligibleApplication,
  AdmissionPaymentQueueRow,
  PaymentQueueQuery,
} from '../types'
import { admissionErrorMessage } from '../utils'

interface QueuePage {
  rows: AdmissionPaymentQueueRow[]
  total: number
  counts: { pending: number; verified: number; rejected: number }
}

async function run(
  action: () => Promise<unknown>,
  done: string,
  fallback: string,
) {
  try {
    await action()
    toast.success(done)
    return { success: true }
  } catch (error: unknown) {
    toast.error(admissionErrorMessage(error, fallback))
    return { success: false }
  }
}

export const paymentQueueService = {
  fetchQueue: async (
    query: PaymentQueueQuery,
  ): Promise<QueuePage | { error: string }> => {
    try {
      const body = (await admissionApi.getPaymentQueue(query)).data
      return {
        rows: body.data ?? [],
        total: body.meta.total,
        counts: body.meta.counts,
      }
    } catch (error: unknown) {
      return {
        error: admissionErrorMessage(error, 'Gagal memuat pembayaran.'),
      }
    }
  },

  fetchEligible: async (
    search: string,
  ): Promise<AdmissionEligibleApplication[]> => {
    try {
      return (await admissionApi.getEligiblePaymentApplications(search)).data
        .data
    } catch {
      return []
    }
  },

  verify: (applicationId: string) =>
    run(
      () =>
        admissionApi.verifyQueuePayment(applicationId, { status: 'VERIFIED' }),
      'Pembayaran diverifikasi.',
      'Gagal memverifikasi pembayaran.',
    ),

  reject: (applicationId: string, note: string) =>
    run(
      () =>
        admissionApi.verifyQueuePayment(applicationId, {
          status: 'REJECTED',
          note,
        }),
      'Pembayaran ditolak.',
      'Gagal menolak pembayaran.',
    ),

  cancel: (applicationId: string, note: string) =>
    run(
      () => admissionApi.cancelPaymentVerification(applicationId, note),
      'Verifikasi pembayaran dibatalkan.',
      'Gagal membatalkan verifikasi.',
    ),

  add: (payload: AddPaymentPayload, file: File) =>
    run(
      () => admissionApi.addPayment(payload, file),
      'Pembayaran ditambahkan.',
      'Gagal menambahkan pembayaran.',
    ),
}
