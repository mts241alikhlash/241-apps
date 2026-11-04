import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  CurriculumQueryParams,
  CurriculumSavePayload,
  Curriculum,
} from '../types'

export const curriculumApi = {
  getCurricula: (params?: CurriculumQueryParams) => {
    return api.get<ApiPaginatedResponse<Curriculum>>('/curricula', { params })
  },

  getCurriculumById: (id: string) => {
    return api.get<ApiSingleResponse<Curriculum>>(`/curricula/${id}`)
  },

  createCurriculum: (payload: CurriculumSavePayload) => {
    return api.post<ApiSingleResponse<Curriculum>>('/curricula', payload)
  },

  updateCurriculum: (id: string, payload: CurriculumSavePayload) => {
    return api.patch<ApiSingleResponse<Curriculum>>(`/curricula/${id}`, payload)
  },

  deleteCurriculum: (id: string) => {
    return api.delete(`/curricula/${id}`)
  },
}
