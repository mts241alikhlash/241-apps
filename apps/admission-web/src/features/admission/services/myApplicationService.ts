import { toast } from 'vue-sonner'
import { isAxiosError } from 'axios'
import { admissionApi } from '../api/admissionApi'
import { useMyApplicationStore } from '../stores/myApplicationStore'
import type { AdmissionApplication, UpdateApplicationPayload } from '../types'
import { admissionErrorMessage } from '../utils'

interface PaymentProofPayload {
  bankName: string
  bankAccountId: string
  senderAccountName: string
  transferDate?: string
}

export const myApplicationService = {
  fetchDashboard: async () => {
    const store = useMyApplicationStore()
    store.loading = true
    store.dashboardError = null
    store.notificationsError = false
    store.announcementsError = false
    store.application = null
    store.notifications = []
    store.unreadCount = 0
    store.announcements = []
    try {
      const appRes = await admissionApi.getMyApplication()
      store.application = appRes.data.data
      const [notifRes, annRes] = await Promise.allSettled([
        admissionApi.getMyNotifications(),
        admissionApi.getAnnouncements(),
      ])
      if (notifRes.status === 'fulfilled') {
        store.notifications = notifRes.value.data.data
        store.unreadCount = notifRes.value.data.meta.unreadCount
      } else store.notificationsError = true
      if (annRes.status === 'fulfilled')
        store.announcements = annRes.value.data.data
      else store.announcementsError = true
    } catch (error: unknown) {
      store.dashboardError =
        isAxiosError(error) && error.response?.status === 404
          ? 'not-found'
          : 'load-failed'
      if (store.dashboardError === 'load-failed')
        toast.error(
          admissionErrorMessage(error, 'Gagal memuat data pendaftaran.'),
        )
    } finally {
      store.loading = false
    }
  },

  markAllRead: async () => {
    const store = useMyApplicationStore()
    try {
      await admissionApi.markAllNotificationsRead()
      store.notifications = store.notifications.map((n) => ({
        ...n,
        readAt: n.readAt ?? new Date().toISOString(),
      }))
      store.unreadCount = 0
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal menandai notifikasi.'))
    }
  },

  fetchMyApplication: async (): Promise<AdmissionApplication | null> => {
    const store = useMyApplicationStore()
    store.formError = null
    try {
      const res = await admissionApi.getMyApplication()
      return res.data.data
    } catch (error: unknown) {
      store.formError =
        isAxiosError(error) && error.response?.status === 404
          ? 'not-found'
          : 'load-failed'
      if (store.formError === 'load-failed')
        toast.error(admissionErrorMessage(error, 'Gagal memuat formulir.'))
      return null
    }
  },

  updateStep: async (payload: UpdateApplicationPayload) => {
    try {
      const res = await admissionApi.updateMyApplication(payload)
      return { success: true as const, data: res.data.data }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal menyimpan formulir.'))
      return { success: false as const }
    }
  },

  uploadDocument: async (typeCode: string, file: File) => {
    try {
      await admissionApi.uploadDocument(typeCode, file)
      return { success: true as const }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal mengunggah berkas.'))
      return { success: false as const }
    }
  },

  uploadAttachment: async (file: File): Promise<{ id: string } | null> => {
    try {
      const res = await admissionApi.uploadAttachment(file)
      return { id: res.data.data.id }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal mengunggah lampiran.'))
      return null
    }
  },

  uploadPaymentProof: async (payload: PaymentProofPayload, file: File) => {
    try {
      await admissionApi.uploadPaymentProof(payload, file)
      return { success: true as const }
    } catch (error: unknown) {
      toast.error(
        admissionErrorMessage(error, 'Gagal mengunggah bukti pembayaran.'),
      )
      return { success: false as const }
    }
  },

  submit: async () => {
    try {
      await admissionApi.submitMyApplication()
      return { success: true as const }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal mengirim formulir.'))
      return { success: false as const }
    }
  },
}
