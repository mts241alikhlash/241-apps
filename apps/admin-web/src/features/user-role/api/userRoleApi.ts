import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  UserWithRoles,
  UserRoleQueryParams,
  UpdateUserAccountPayload,
} from '../types'
import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'

export const userRoleApi = {
  getUsers: (params?: UserRoleQueryParams) => {
    return api.get<ApiPaginatedResponse<UserWithRoles>>('/users', { params })
  },
  getUserById: (userId: string) => {
    return api.get<ApiSingleResponse<UserWithRoles>>(`/users/${userId}`)
  },
  updateUserAccount: (userId: string, payload: UpdateUserAccountPayload) => {
    return api.patch<ApiSingleResponse<UserWithRoles>>(
      `/users/${userId}`,
      payload,
    )
  },
  getRoles: () => {
    return api.get<
      ApiSingleResponse<{ id: string; code: string; name: string }[]>
    >('/roles')
  },
  assignRole: (roleId: string, userId: string) => {
    return api.post<void>(`/roles/${roleId}/assign`, { userId })
  },
  unassignRole: (roleId: string, userId: string) => {
    return api.delete<void>(`/roles/${roleId}/users/${userId}`)
  },
}
