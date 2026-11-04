import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetSubjectsInput extends PaginationQueryInput {
  search?: string
}
