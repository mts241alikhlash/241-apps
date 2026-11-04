import { AssessmentType } from '@mts241alikhlash/nest-core/domain'

export interface UpdateAssessmentItemInput {
  name?: string
  type?: AssessmentType
  weight?: number
  maxScore?: number
}
