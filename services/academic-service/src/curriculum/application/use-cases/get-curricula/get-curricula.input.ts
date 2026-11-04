import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetCurriculaInput extends PaginationQueryInput {
  search?: string
  academicYearId?: string
  isActive?: boolean
}
