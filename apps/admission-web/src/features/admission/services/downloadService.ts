import { toast } from 'vue-sonner'
import { admissionApi } from '../api/admissionApi'
import type { AdmissionDownloadAdmin, DownloadSavePayload } from '../types'
import { admissionErrorMessage } from '../utils'

export const downloadService = {
  fetchAll: async (): Promise<
    { downloads: AdmissionDownloadAdmin[] } | { error: string }
  > => {
    try {
      return { downloads: (await admissionApi.getDownloads()).data.data ?? [] }
    } catch (error: unknown) {
      return {
        error: admissionErrorMessage(error, 'Gagal memuat berkas unduhan.'),
      }
    }
  },

  save: async (id: string | null, payload: DownloadSavePayload) => {
    try {
      if (id) await admissionApi.updateDownload(id, payload)
      else await admissionApi.createDownload(payload)
      toast.success(id ? 'Berkas diperbarui.' : 'Berkas ditambahkan.')
      return { success: true }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal menyimpan berkas.'))
      return { success: false }
    }
  },

  reorder: async (ids: string[]) => {
    try {
      await admissionApi.reorderDownloads(ids)
      return { success: true }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal mengubah urutan.'))
      return { success: false }
    }
  },

  remove: async (id: string) => {
    try {
      await admissionApi.deleteDownload(id)
      toast.success('Berkas dihapus.')
      return { success: true }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal menghapus berkas.'))
      return { success: false }
    }
  },
}
