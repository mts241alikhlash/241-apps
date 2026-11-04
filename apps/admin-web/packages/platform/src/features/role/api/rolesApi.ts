import api from '@mts241alikhlash/web-shared/utils/api'
import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import type {
  Role,
  Permission,
  CreateRolePayload,
  UpdateRolePayload,
  RoleUsage,
} from '../types'

export const rolesApi = {
  getRoles: () => {
    return api.get<ApiSingleResponse<Role[]>>('/roles')
  },
  getRoleById: (id: string) => {
    return api.get<ApiSingleResponse<Role>>(`/roles/${id}`)
  },
  createRole: (payload: CreateRolePayload) => {
    return api.post<ApiSingleResponse<Role>>('/roles', payload)
  },
  updateRole: (id: string, payload: UpdateRolePayload) => {
    return api.patch<ApiSingleResponse<Role>>(`/roles/${id}`, payload)
  },
  deleteRole: (id: string) => {
    return api.delete<void>(`/roles/${id}`)
  },
  getRoleUsage: () => {
    return api.get<ApiSingleResponse<RoleUsage[]>>(
      '/inventory/workflows/role-usage',
    )
  },
  getPermissions: () => {
    return api.get<ApiSingleResponse<Permission[]>>('/permissions')
  },
}
