import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { admissionApi } from '../api/admissionApi'
import { useStatsStore } from '../stores/statsStore'

export const statsService = {
  fetchStats: async (
    filter: { waveId?: string; academicYearId?: string } = {},
  ) => {
    const store = useStatsStore()
    store.loading = true
    store.error = null
    try {
      const res = await admissionApi.getStats(filter)
      store.stats = res.data.data
    } catch (error: unknown) {
      store.stats = null
      store.error = getIndonesianErrorMessage(
        error,
        'Gagal memuat statistik PSB.',
      )
    } finally {
      store.loading = false
    }
  },
}
