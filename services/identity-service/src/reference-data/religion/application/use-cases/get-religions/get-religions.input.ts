import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface ListReligionsInput extends PaginationQueryInput {
  search?: string
  isActive?: boolean
}
