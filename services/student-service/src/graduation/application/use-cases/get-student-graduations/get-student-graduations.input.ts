import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetStudentGraduationsInput extends PaginationQueryInput {
  academicYearId?: string
  search?: string
}
