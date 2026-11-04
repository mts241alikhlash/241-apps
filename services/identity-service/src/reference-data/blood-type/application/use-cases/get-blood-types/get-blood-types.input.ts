import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface ListBloodTypesInput extends PaginationQueryInput {
  search?: string
  isActive?: boolean
}
