import { AssessmentType } from '@mts241alikhlash/nest-core/domain'

export interface AssessmentWeightEntity {
  type: AssessmentType
  weight: number
  id?: string
  teachingAssignmentId?: string
}
