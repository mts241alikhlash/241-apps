import { academicSettingApi } from '../api/academicSettingApi'
import { useAcademicSettingStore } from '../stores/academicSettingStore'
import type { AcademicSettingSavePayload } from '../types'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { toast } from 'vue-sonner'

export const academicSettingService = {
  fetchAcademicSetting: async () => {
    const store = useAcademicSettingStore()
    store.loading = true
    store.loadError = null
    try {
      const res = await academicSettingApi.getAcademicSetting()
      const setting = res.data.data
      if (!setting) return
      store.weeklyHolidays = setting.weeklyHolidays ?? []
      store.defaultPassingScore = setting.defaultPassingScore
    } catch (error: unknown) {
      store.loadError = getIndonesianErrorMessage(
        error,
        'Gagal memuat pengaturan akademik.',
      )
    } finally {
      store.loading = false
    }
  },

  saveAcademicSetting: async (payload: AcademicSettingSavePayload) => {
    const store = useAcademicSettingStore()
    store.isSaving = true
    store.formError = null
    try {
      const res = await academicSettingApi.updateAcademicSetting(payload)
      const saved = res.data.data
      store.weeklyHolidays = saved?.weeklyHolidays ?? payload.weeklyHolidays
      store.defaultPassingScore =
        saved?.defaultPassingScore ?? payload.defaultPassingScore
      toast.success('Pengaturan akademik berhasil disimpan.')
      return { success: true }
    } catch (error: unknown) {
      store.formError = getIndonesianErrorMessage(
        error,
        'Gagal menyimpan pengaturan akademik.',
      )
      toast.error(store.formError)
      return { success: false, error: store.formError }
    } finally {
      store.isSaving = false
    }
  },
}
