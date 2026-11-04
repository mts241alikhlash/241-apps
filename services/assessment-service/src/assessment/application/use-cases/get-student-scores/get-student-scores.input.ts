import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetStudentScoresInput extends PaginationQueryInput {
  enrollmentId?: string
  assessmentItemId?: string
  semesterId?: string
}
