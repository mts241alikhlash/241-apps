import { AssessmentType } from '@mts241alikhlash/nest-core/domain'

export interface CreateAssessmentItemInput {
  teachingAssignmentId: string
  name: string
  type: AssessmentType
  weight?: number
  maxScore?: number
}
