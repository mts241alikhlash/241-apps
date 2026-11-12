import type { components } from '@mts241alikhlash/academic-api'

export type Semester = components['schemas']['SemesterResponseDto']

export interface SemesterQueryParams {
  page?: number
  limit?: number
  search?: string
  academicYearId?: string
  isActive?: boolean
}
