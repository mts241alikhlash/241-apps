import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  TeachingAssignment,
  TeachingAssignmentCreatePayload,
  TeachingAssignmentCreateResult,
  TeachingAssignmentQueryParams,
  TeachingAssignmentUpdatePayload,
} from '../types'

export const teachingAssignmentApi = {
  getTeachingAssignments: (params?: TeachingAssignmentQueryParams) => {
    return api.get<ApiPaginatedResponse<TeachingAssignment>>(
      '/teaching-assignments',
      { params },
    )
  },

  getMyTeachingAssignments: (params?: TeachingAssignmentQueryParams) => {
    return api.get<ApiPaginatedResponse<TeachingAssignment>>(
      '/teaching-assignments/me',
      { params },
    )
  },

  createTeachingAssignment: (payload: TeachingAssignmentCreatePayload) => {
    return api.post<ApiSingleResponse<TeachingAssignmentCreateResult>>(
      '/teaching-assignments',
      payload,
    )
  },

  updateTeachingAssignment: (
    id: string,
    payload: Partial<TeachingAssignmentUpdatePayload>,
  ) => {
    return api.patch<ApiSingleResponse<TeachingAssignment>>(
      `/teaching-assignments/${id}`,
      payload,
    )
  },

  deleteTeachingAssignment: (id: string) => {
    return api.delete(`/teaching-assignments/${id}`)
  },
}
