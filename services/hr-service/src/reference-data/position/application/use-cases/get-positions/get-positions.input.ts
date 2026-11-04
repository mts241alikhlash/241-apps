import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface ListPositionsInput extends PaginationQueryInput {
  search?: string
  categoryId?: string
  isActive?: boolean
}
