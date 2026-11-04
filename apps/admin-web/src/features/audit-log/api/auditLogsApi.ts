import api from '@mts241alikhlash/web-shared/utils/api'
import type { ApiPaginatedResponse } from '@mts241alikhlash/web-shared/types/api'
import type { AuditLog, AuditLogQueryParams } from '../types'

export const auditLogsApi = {
  getAuditLogs: (params?: AuditLogQueryParams) => {
    return api.get<ApiPaginatedResponse<AuditLog>>('/audit-logs', { params })
  },
}
