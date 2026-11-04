import type { components } from '@mts241alikhlash/hr-api'
export type PositionCategory =
  components['schemas']['PositionCategoryResponseDto']

export interface PositionCategoryCreatePayload {
  code: string
  name: string
}

export interface PositionCategoryUpdatePayload {
  name: string
}

export interface PositionCategoryQuery {
  page?: number
  limit?: number
  search?: string
}
