import type { ApiPaginatedResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type { UserOption } from '../types'

export const staffApi = {
  getUsers: (params?: { roleCode?: string; search?: string; limit?: number }) =>
    api.get<ApiPaginatedResponse<UserOption>>('/users', { params }),
}
