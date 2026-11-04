import type {
  ApiSingleResponse,
  ApiPaginatedResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  StudentScoreRosterResponse,
  BulkUpsertStudentScorePayload,
  StudentScoreItem,
} from '../types'

export const studentScoreApi = {
  getScores: (params: { enrollmentId?: string; limit?: number }) => {
    return api.get<ApiPaginatedResponse<StudentScoreItem>>('/student-scores', {
      params,
    })
  },

  getMyScores: (params?: {
    semesterId?: string
    enrollmentId?: string
    limit?: number
  }) => {
    return api.get<ApiPaginatedResponse<StudentScoreItem>>(
      '/student-scores/me',
      { params },
    )
  },

  getRoster: (assessmentItemId: string) => {
    return api.get<ApiSingleResponse<StudentScoreRosterResponse>>(
      '/student-scores/roster',
      { params: { assessmentItemId } },
    )
  },

  bulkUpsertScores: (payload: BulkUpsertStudentScorePayload) => {
    return api.post<ApiSingleResponse<{ saved: number }>>(
      '/student-scores/bulk',
      payload,
    )
  },

  bulkUpsertAssignedScores: (payload: BulkUpsertStudentScorePayload) => {
    return api.post<ApiSingleResponse<{ saved: number }>>(
      '/student-scores/assigned/bulk',
      payload,
    )
  },
}
