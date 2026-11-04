import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import type { DashboardSummary } from '../types'
import api from '@mts241alikhlash/web-shared/utils/api'

export const dashboardApi = {
  getSummary: () => {
    return api.get<ApiSingleResponse<DashboardSummary>>('/dashboard/summary')
  },
}
