import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  PositionCategory,
  PositionCategoryCreatePayload,
  PositionCategoryUpdatePayload,
  PositionCategoryQuery,
} from '../types'

export const positionCategoryApi = {
  getPositionCategories: (params?: PositionCategoryQuery) =>
    api.get<ApiPaginatedResponse<PositionCategory>>('/position-categories', {
      params,
    }),

  getPositionCategory: (id: string) =>
    api.get<ApiSingleResponse<PositionCategory>>(`/position-categories/${id}`),

  createPositionCategory: (payload: PositionCategoryCreatePayload) =>
    api.post<ApiSingleResponse<PositionCategory>>(
      '/position-categories',
      payload,
    ),

  updatePositionCategory: (
    id: string,
    payload: PositionCategoryUpdatePayload,
  ) =>
    api.patch<ApiSingleResponse<PositionCategory>>(
      `/position-categories/${id}`,
      payload,
    ),

  deletePositionCategory: (id: string) =>
    api.delete(`/position-categories/${id}`),
}
