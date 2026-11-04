import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface StudentParentQueryInput extends PaginationQueryInput {
  studentId?: string
}
