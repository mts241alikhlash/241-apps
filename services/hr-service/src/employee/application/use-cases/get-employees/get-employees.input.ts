import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetEmployeesInput extends PaginationQueryInput {
  search?: string
  employmentTypeId?: string
  academicYearId?: string
  positionCategoryId?: string
  isActive?: boolean
}
