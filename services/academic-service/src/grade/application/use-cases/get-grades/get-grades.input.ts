import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetGradesInput extends PaginationQueryInput {
  search?: string
  isActive?: boolean
}
