import type { components } from '@mts241alikhlash/hr-api'
export type EmploymentType = components['schemas']['EmploymentTypeResponseDto']

export interface EmploymentTypeCreatePayload {
  code: string
  name: string
}

export interface EmploymentTypeUpdatePayload {
  name: string
}

export interface EmploymentTypeQuery {
  page?: number
  limit?: number
  search?: string
}
