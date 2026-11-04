import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import type {
  GenerateRecommendationPayload,
  PromotionPayload,
  PromotionPreviewResponse,
  PromotionRecommendationResponse,
  PromotionResult,
  RolloverSemesterPayload,
  RolloverSummary,
  Semester,
  SemesterQueryParams,
  SemesterSavePayload,
} from '../types'
import api from '@mts241alikhlash/web-shared/utils/api'

export const semesterApi = {
  getSemesters: (params?: SemesterQueryParams) => {
    return api.get<ApiPaginatedResponse<Semester>>('/semesters', { params })
  },

  getSemesterById: (id: string) => {
    return api.get<ApiSingleResponse<Semester>>(`/semesters/${id}`)
  },

  createSemester: (payload: SemesterSavePayload) => {
    return api.post<ApiSingleResponse<Semester>>('/semesters', payload)
  },

  updateSemester: (id: string, payload: SemesterSavePayload) => {
    return api.patch<ApiSingleResponse<Semester>>(`/semesters/${id}`, payload)
  },

  deleteSemester: (id: string) => {
    return api.delete(`/semesters/${id}`)
  },

  rolloverSemester: (payload: RolloverSemesterPayload) => {
    return api.post<ApiSingleResponse<RolloverSummary>>(
      '/semester-rollovers',
      payload,
    )
  },

  activateSemester: (id: string) => {
    return api.patch<ApiSingleResponse<Semester>>(`/semesters/${id}/activate`)
  },

  deactivateSemester: (id: string) => {
    return api.patch<ApiSingleResponse<Semester>>(`/semesters/${id}/deactivate`)
  },

  getPromotionRecommendation: (payload: GenerateRecommendationPayload) => {
    return api.post<ApiSingleResponse<PromotionRecommendationResponse>>(
      '/student-promotions/recommend',
      payload,
    )
  },

  previewPromotion: (payload: PromotionPayload) => {
    return api.post<ApiSingleResponse<PromotionPreviewResponse>>(
      '/student-promotions/preview',
      payload,
    )
  },

  executePromotion: (payload: PromotionPayload) => {
    return api.post<ApiSingleResponse<PromotionResult>>(
      '/student-promotions',
      payload,
    )
  },
}
