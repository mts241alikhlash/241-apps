import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { myDashboardApi } from '../api/myDashboardApi'
import { useMyDashboardStore } from '../stores/myDashboardStore'

export const myDashboardService = {
  fetchMyDashboard: async () => {
    const store = useMyDashboardStore()
    store.loading = true
    store.loadError = null
    try {
      const res = await myDashboardApi.getMyDashboard()
      store.dashboard = res.data.data ?? null
    } catch (error: unknown) {
      store.loadError = getIndonesianErrorMessage(
        error,
        'Gagal memuat dashboard.',
      )
    } finally {
      store.loading = false
      store.loaded = true
    }
  },
}
