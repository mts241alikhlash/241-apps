import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import type {
  StudentParent,
  StudentParentSavePayload,
  StudentParentUpdatePayload,
  StudentParentQueryParams,
} from '../types'
import api from '@mts241alikhlash/web-shared/utils/api'

export const studentParentApi = {
  getAll: (params?: StudentParentQueryParams) => {
    return api.get<ApiPaginatedResponse<StudentParent>>('/student-parents', {
      params,
    })
  },

  getById: (id: string) => {
    return api.get<ApiSingleResponse<StudentParent>>(`/student-parents/${id}`)
  },

  create: (payload: StudentParentSavePayload) => {
    return api.post<ApiSingleResponse<StudentParent>>(
      '/student-parents',
      payload,
    )
  },

  update: (id: string, payload: StudentParentUpdatePayload) => {
    return api.patch<ApiSingleResponse<StudentParent>>(
      `/student-parents/${id}`,
      payload,
    )
  },

  delete: (id: string) => {
    return api.delete(`/student-parents/${id}`)
  },
}
