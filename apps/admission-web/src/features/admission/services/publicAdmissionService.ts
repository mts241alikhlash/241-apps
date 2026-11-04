import { admissionApi } from '../api/admissionApi'
import type { PublicRegisterPayload } from '../types'
import { notifyIfOutage } from '@mts241alikhlash/web-shared/utils/notify-outage'
import { admissionErrorMessage } from '../utils'

function errorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status
}

export const publicAdmissionService = {
  fetchGrades: async () => {
    try {
      const res = await admissionApi.getGrades()
      return res.data.data
    } catch (err) {
      notifyIfOutage(err)
      return null
    }
  },

  fetchActiveWaves: async () => {
    try {
      const res = await admissionApi.getActiveWaves()
      return res.data.data
    } catch (err) {
      notifyIfOutage(err)
      return null
    }
  },

  fetchActiveDownloads: async () => {
    try {
      const res = await admissionApi.getActiveDownloads()
      return res.data.data ?? []
    } catch (err) {
      notifyIfOutage(err)
      return []
    }
  },

  register: async (payload: PublicRegisterPayload) => {
    try {
      const res = await admissionApi.register(payload)
      return { success: true as const, data: res.data.data }
    } catch (error: unknown) {
      const outage = notifyIfOutage(error)
      return {
        success: false as const,
        status: errorStatus(error),
        outage,
        error: admissionErrorMessage(error, 'Gagal membuat akun pendaftaran.'),
      }
    }
  },

  ensureMyApplication: async () => {
    try {
      const res = await admissionApi.ensureMyApplication()
      return res.data.data
    } catch (err) {
      notifyIfOutage(err)
      return null
    }
  },

  fetchAnnouncements: async () => {
    try {
      const res = await admissionApi.getAnnouncements()
      return res.data.data
    } catch (err) {
      notifyIfOutage(err)
      return []
    }
  },
}
