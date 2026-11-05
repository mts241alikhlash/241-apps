import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type { InstitutionDashboard, MyDashboard } from '../types'

export const myDashboardApi = {
  getMyDashboard: () => {
    return api.get<ApiSingleResponse<MyDashboard>>('/dashboards/me')
  },
  getInstitutionDashboard: () => {
    return api.get<ApiSingleResponse<InstitutionDashboard>>(
      '/dashboards/institution',
    )
  },
}
