import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface ListSemesterTypesInput extends PaginationQueryInput {
  search?: string
  isActive?: boolean
}
