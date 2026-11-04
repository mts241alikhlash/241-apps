import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  EmploymentType,
  EmploymentTypeCreatePayload,
  EmploymentTypeUpdatePayload,
  EmploymentTypeQuery,
} from '../types'

export const employmentTypeApi = {
  getEmploymentTypes: (params?: EmploymentTypeQuery) =>
    api.get<ApiPaginatedResponse<EmploymentType>>('/employment-types', {
      params,
    }),

  getEmploymentType: (id: string) =>
    api.get<ApiSingleResponse<EmploymentType>>(`/employment-types/${id}`),

  createEmploymentType: (payload: EmploymentTypeCreatePayload) =>
    api.post<ApiSingleResponse<EmploymentType>>('/employment-types', payload),

  updateEmploymentType: (id: string, payload: EmploymentTypeUpdatePayload) =>
    api.patch<ApiSingleResponse<EmploymentType>>(
      `/employment-types/${id}`,
      payload,
    ),

  deleteEmploymentType: (id: string) => api.delete(`/employment-types/${id}`),
}
