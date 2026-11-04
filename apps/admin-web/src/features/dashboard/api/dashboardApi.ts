import api from '@mts241alikhlash/web-shared/utils/api'
import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'

export interface UserSummary {
  total: number
  active: number
  inactive: number
}

export interface AuditLogSummary {
  total: number
  since: number
}

interface Identified {
  id: string
}

async function lengthOf(path: string): Promise<number> {
  const res = await api.get<ApiSingleResponse<Identified[]>>(path)
  return res.data.data.length
}

export const dashboardApi = {
  users: async (): Promise<UserSummary> => {
    const res = await api.get<ApiSingleResponse<UserSummary>>('/users/summary')
    return res.data.data
  },
  auditLogs: async (): Promise<AuditLogSummary> => {
    const res = await api.get<ApiSingleResponse<AuditLogSummary>>(
      '/audit-logs/summary',
    )
    return res.data.data
  },
  roleCount: () => lengthOf('/roles'),
  permissionCount: () => lengthOf('/permissions'),
}
