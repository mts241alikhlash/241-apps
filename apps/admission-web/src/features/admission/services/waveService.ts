import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { admissionApi } from '../api/admissionApi'
import { useWaveStore } from '../stores/waveStore'
import type { WaveSavePayload } from '../types'
import { useReferenceList } from '@/features/platform/reference-data'
import { notifyIfOutage } from '@mts241alikhlash/web-shared/utils/notify-outage'

export const waveService = {
  fetchAcademicYears: async () => {
    const store = useWaveStore()
    try {
      const res = await admissionApi.getAcademicYears()
      store.academicYears = res.data.data ?? []
    } catch (err) {
      notifyIfOutage(err)
      store.academicYears = []
    }
  },

  saveWave: async (id: string | null, payload: WaveSavePayload) => {
    const store = useWaveStore()
    store.isSaving = true
    store.formError = null
    try {
      if (id) {
        await admissionApi.updateWave(id, payload)
        toast.success('Gelombang berhasil diperbarui.')
      } else {
        await admissionApi.createWave(payload)
        toast.success('Gelombang baru berhasil dibuat.')
      }
      useReferenceList().invalidate('admissionWaves')
      return { success: true }
    } catch (error: unknown) {
      store.formError = getIndonesianErrorMessage(
        error,
        'Gagal menyimpan gelombang.',
      )
      toast.error(store.formError)
      return { success: false, error: store.formError }
    } finally {
      store.isSaving = false
    }
  },

  deleteWave: async (id: string) => {
    try {
      await admissionApi.deleteWave(id)
      toast.success('Gelombang dihapus.')
      useReferenceList().invalidate('admissionWaves')
      return { success: true }
    } catch (error: unknown) {
      const msg = getIndonesianErrorMessage(error, 'Gagal menghapus gelombang.')
      toast.error(msg)
      return { success: false, error: msg }
    }
  },
}
