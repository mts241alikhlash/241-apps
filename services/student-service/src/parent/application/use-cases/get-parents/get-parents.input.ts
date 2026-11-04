import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface ListParentsInput extends PaginationQueryInput {
  search?: string
  occupationId?: string
}
