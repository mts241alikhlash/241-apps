import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetClassroomsInput extends PaginationQueryInput {
  academicYearId?: string
  gradeId?: string
  search?: string
  isActive?: boolean
}
