import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetAssessmentItemsInput extends PaginationQueryInput {
  type?: AssessmentType
  teachingAssignmentId?: string
}
