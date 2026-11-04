import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetAcademicCalendarsInput extends PaginationQueryInput {
  academicYearId?: string
  semesterId?: string
  typeId?: string
}
