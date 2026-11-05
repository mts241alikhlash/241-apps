import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'

export interface NamedTotal {
  name: string
  total: number
}

export interface AssetDashboard {
  total: number
  byStatus: NamedTotal[]
  byCondition: NamedTotal[]
}

export interface LoanDashboard {
  active: number
  overdue: number
}

async function data<T>(request: Promise<{ data: ApiSingleResponse<T> }>) {
  return (await request).data.data
}

export const dashboardApi = {
  assets: () =>
    data(
      api.get<ApiSingleResponse<AssetDashboard>>('/inventory/dashboard/assets'),
    ),
  loans: () =>
    data(
      api.get<ApiSingleResponse<LoanDashboard>>('/inventory/dashboard/loans'),
    ),
  pendingApprovals: async () =>
    (await data(api.get<ApiSingleResponse<unknown[]>>('/inventory/approvals')))
      .length,
}
