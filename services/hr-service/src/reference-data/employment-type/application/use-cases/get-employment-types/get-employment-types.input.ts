import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface ListEmploymentTypesInput extends PaginationQueryInput {
  search?: string
}
