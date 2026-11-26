import type { AssessmentType } from './assessment-item'

export interface AssessmentItemQueryParams {
  page?: number
  limit?: number
  teachingAssignmentId?: string
  teachingAssignmentIds?: string
  type?: AssessmentType
}
