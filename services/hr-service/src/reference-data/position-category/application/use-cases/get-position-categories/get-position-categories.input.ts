import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface ListPositionCategoriesInput extends PaginationQueryInput {
  search?: string
}
