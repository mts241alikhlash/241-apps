import { AssessmentType } from '@mts241alikhlash/nest-core/domain'

export interface AssessmentWeightRecordInput {
  type: AssessmentType
  weight: number
}

export interface ReplaceAssessmentWeightsInput {
  teachingAssignmentId: string
  weights: AssessmentWeightRecordInput[]
}
