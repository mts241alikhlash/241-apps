import { isAxiosError } from 'axios'
import { toast } from 'vue-sonner'
import { admissionApi } from '../api/admissionApi'
import type {
  AdmissionDocumentReview,
  AdmissionDocumentReviewRow,
  AdmissionDocumentReviewSend,
  DocumentReviewQuery,
} from '../types'
import { admissionErrorMessage } from '../utils'

interface QueuePage {
  rows: AdmissionDocumentReviewRow[]
  total: number
  counts: { waiting: number; revision: number; done: number }
}

function sendMessage(result: AdmissionDocumentReviewSend) {
  if (result.outcome === 'REVISION_REQUESTED') {
    return 'Formulir dikembalikan ke pendaftar.'
  }
  return result.verified
    ? 'Hasil dikirim. Pendaftaran terverifikasi.'
    : 'Hasil dikirim. Pendaftaran terverifikasi otomatis setelah pembayaran diverifikasi.'
}

export const documentReviewService = {
  fetchQueue: async (
    query: DocumentReviewQuery,
  ): Promise<QueuePage | { error: string }> => {
    try {
      const body = (await admissionApi.getDocumentReviews(query)).data
      return {
        rows: body.data ?? [],
        total: body.meta.total,
        counts: body.meta.counts,
      }
    } catch (error: unknown) {
      return {
        error: admissionErrorMessage(error, 'Gagal memuat antrean berkas.'),
      }
    }
  },

  fetchReview: async (
    applicationId: string,
  ): Promise<
    { review: AdmissionDocumentReview } | { error: 'not-found' | 'load-failed' }
  > => {
    try {
      return {
        review: (await admissionApi.getDocumentReview(applicationId)).data.data,
      }
    } catch (error: unknown) {
      return {
        error:
          isAxiosError(error) && error.response?.status === 404
            ? 'not-found'
            : 'load-failed',
      }
    }
  },

  decide: async (
    applicationId: string,
    documentId: string,
    status: 'APPROVED' | 'REJECTED',
    note?: string,
  ) => {
    try {
      await admissionApi.saveDocumentDecision(applicationId, documentId, {
        status,
        note,
      })
      return { success: true }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal menyimpan keputusan.'))
      return { success: false }
    }
  },

  send: async (applicationId: string, dataNote?: string) => {
    try {
      const result = (
        await admissionApi.sendDocumentReview(applicationId, { dataNote })
      ).data.data
      toast.success(sendMessage(result))
      return { success: true as const, result }
    } catch (error: unknown) {
      toast.error(
        admissionErrorMessage(error, 'Gagal mengirim hasil pemeriksaan.'),
      )
      return { success: false as const }
    }
  },
}
