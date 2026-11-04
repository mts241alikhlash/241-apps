import { toast } from 'vue-sonner'
import { admissionApi } from '../api/admissionApi'
import type { AdmissionDecisionRow, DecisionQueueQuery } from '../types'
import { admissionErrorMessage } from '../utils'

interface QueuePage {
  rows: AdmissionDecisionRow[]
  total: number
  counts: { waiting: number; accepted: number; rejected: number }
}

async function run(
  action: () => Promise<unknown>,
  done: string,
  fallback: string,
  description?: string,
) {
  try {
    await action()
    if (description) toast.success(done, { description })
    else toast.success(done)
    return { success: true }
  } catch (error: unknown) {
    toast.error(admissionErrorMessage(error, fallback))
    return { success: false }
  }
}

export const decisionService = {
  fetchQueue: async (
    query: DecisionQueueQuery,
  ): Promise<QueuePage | { error: string }> => {
    try {
      const body = (await admissionApi.getDecisionQueue(query)).data
      return {
        rows: body.data ?? [],
        total: body.meta.total,
        counts: body.meta.counts,
      }
    } catch (error: unknown) {
      return {
        error: admissionErrorMessage(error, 'Gagal memuat antrean keputusan.'),
      }
    }
  },

  accept: (applicationId: string, note?: string) =>
    run(
      () =>
        admissionApi.acceptDecision(applicationId, note?.trim() || undefined),
      'Pendaftar diterima.',
      'Gagal menerima pendaftar.',
      'Status pendaftar diubah menjadi diterima dan siap daftar ulang.',
    ),

  reject: (applicationId: string, reason: string) =>
    run(
      () => admissionApi.rejectDecision(applicationId, reason.trim()),
      'Pendaftar ditolak.',
      'Gagal menolak pendaftar.',
      'Pendaftar diberi tahu hasil keputusan penolakan beserta alasannya.',
    ),

  acceptMany: async (applicationIds: string[], note?: string) => {
    try {
      const results = (
        await admissionApi.acceptManyDecisions(
          applicationIds,
          note?.trim() || undefined,
        )
      ).data.data.results
      const accepted = results.filter(
        (result) => result.outcome === 'ACCEPTED',
      ).length
      const skipped = results
        .filter((result) => result.outcome === 'SKIPPED')
        .map((result) => ({
          applicationId: result.applicationId,
          reason: result.reason ?? 'Dilewati',
        }))
      const description =
        skipped.length > 0
          ? `${accepted} pendaftar diterima, ${skipped.length} dilewati.`
          : `${accepted} pendaftar diterima.`
      toast.success('Penerimaan massal selesai diproses.', {
        description,
      })
      return { success: true as const, accepted, skipped }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal menerima pendaftar.'))
      return { success: false as const }
    }
  },

  cancelAcceptance: (applicationId: string, reason: string) =>
    run(
      () => admissionApi.cancelAcceptance(applicationId, reason.trim()),
      'Penerimaan dibatalkan.',
      'Gagal membatalkan penerimaan.',
      'Pendaftar dikembalikan ke antrean menunggu keputusan.',
    ),

  cancelRejection: async (applicationId: string, reason: string) => {
    try {
      const decision = (
        await admissionApi.cancelRejection(applicationId, reason.trim())
      ).data.data
      toast.success('Penolakan dibatalkan.', {
        description:
          decision.status === 'VERIFIED'
            ? 'Pendaftar dikembalikan ke antrean menunggu keputusan.'
            : 'Pendaftar dikembalikan ke antrean verifikasi berkas.',
      })
      return { success: true }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal membatalkan penolakan.'))
      return { success: false }
    }
  },
}
