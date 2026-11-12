import type { components } from '@mts241alikhlash/academic-api'

export type Subject = components['schemas']['SubjectPageItemResponseDto']

export interface SubjectQueryParams {
  page?: number
  limit?: number
  search?: string
}
