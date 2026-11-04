import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface ListAcademicCalendarTypesInput extends PaginationQueryInput {
  search?: string
  isActive?: boolean
}
