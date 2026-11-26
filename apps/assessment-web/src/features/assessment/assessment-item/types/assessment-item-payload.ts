import type { AssessmentType } from './assessment-item'

export interface AssessmentItemUpdatePayload {
  name: string
  type: AssessmentType
  weight?: number
  maxScore?: number
  material?: string | null
  kktp?: number | null
}

export interface AssessmentItemCreatePayload extends AssessmentItemUpdatePayload {
  teachingAssignmentId: string
}

export type AssessmentItemSavePayload =
  AssessmentItemCreatePayload | AssessmentItemUpdatePayload
