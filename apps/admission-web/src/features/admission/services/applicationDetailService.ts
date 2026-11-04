import { toast } from 'vue-sonner'
import { isAxiosError } from 'axios'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { admissionApi } from '../api/admissionApi'
import { useApplicationDetailStore } from '../stores/applicationDetailStore'

interface EnrollPayload {
  nis?: string
  nisn?: string
  gradeId?: string
  classroomId?: string
}

async function runAction(
  applicationId: string,
  action: () => Promise<unknown>,
  successMessage: string,
) {
  const store = useApplicationDetailStore()
  store.acting = true
  try {
    await action()
    toast.success(successMessage)
    await applicationDetailService.fetchDetail(applicationId)
    return { success: true }
  } catch (error: unknown) {
    toast.error(getIndonesianErrorMessage(error, 'Aksi gagal dijalankan.'))
    return { success: false }
  } finally {
    store.acting = false
  }
}

export const applicationDetailService = {
  fetchDetail: async (id: string) => {
    const store = useApplicationDetailStore()
    const current = ++store.requestId
    store.application = null
    store.error = null
    store.loading = true
    try {
      const res = await admissionApi.getApplicationById(id)
      if (current === store.requestId) store.application = res.data.data
    } catch (error: unknown) {
      if (current === store.requestId) {
        store.error =
          isAxiosError(error) && error.response?.status === 404
            ? 'not-found'
            : 'load-failed'
        if (store.error === 'load-failed') {
          toast.error(
            getIndonesianErrorMessage(error, 'Gagal memuat detail pendaftar.'),
          )
        }
      }
    } finally {
      if (current === store.requestId) store.loading = false
    }
  },

  approveDocument: (applicationId: string, documentId: string) =>
    runAction(
      applicationId,
      () =>
        admissionApi.verifyDocument(applicationId, documentId, {
          status: 'APPROVED',
        }),
      'Berkas disetujui.',
    ),

  rejectDocument: (applicationId: string, documentId: string, note: string) =>
    runAction(
      applicationId,
      () =>
        admissionApi.verifyDocument(applicationId, documentId, {
          status: 'REJECTED',
          note,
        }),
      'Berkas ditolak.',
    ),

  verifyPaymentApprove: (applicationId: string) =>
    runAction(
      applicationId,
      () => admissionApi.verifyPayment(applicationId, { status: 'VERIFIED' }),
      'Pembayaran diverifikasi.',
    ),

  rejectPayment: (applicationId: string, note: string) =>
    runAction(
      applicationId,
      () =>
        admissionApi.verifyPayment(applicationId, {
          status: 'REJECTED',
          note,
        }),
      'Bukti pembayaran ditolak.',
    ),

  requestRevision: (applicationId: string, note: string) =>
    runAction(
      applicationId,
      () => admissionApi.requestRevision(applicationId, note),
      'Pendaftaran dikembalikan untuk revisi.',
    ),

  verifyApplication: (applicationId: string) =>
    runAction(
      applicationId,
      () => admissionApi.verifyApplication(applicationId),
      'Aplikasi diverifikasi.',
    ),

  accept: async (applicationId: string, note?: string) => {
    const store = useApplicationDetailStore()
    store.acting = true
    try {
      await admissionApi.acceptApplication(applicationId, note)
      toast.success('Pendaftar dinyatakan DITERIMA.')
      await applicationDetailService.fetchDetail(applicationId)
      return { success: true }
    } catch (error: unknown) {
      toast.error(getIndonesianErrorMessage(error, 'Aksi gagal dijalankan.'))
      return { success: false }
    } finally {
      store.acting = false
    }
  },

  reject: (applicationId: string, reason: string) =>
    runAction(
      applicationId,
      () => admissionApi.rejectApplication(applicationId, reason),
      'Pendaftaran ditolak.',
    ),

  enroll: (applicationId: string, payload: EnrollPayload) =>
    runAction(
      applicationId,
      () => admissionApi.enrollApplicant(applicationId, payload),
      'Pendaftar berhasil diproses menjadi santri.',
    ),
}
