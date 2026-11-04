import type { AssessmentType } from '@/features/assessment/assessment-item'

export interface AssessmentWeight {
  type: AssessmentType
  weight: number
}

export interface ReplaceAssessmentWeightsPayload {
  teachingAssignmentId: string
  weights: AssessmentWeight[]
}

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  DAILY: 'Harian',
  ASSIGNMENT: 'Tugas',
  PRACTICAL: 'Praktik',
  MIDTERM: 'UTS',
  FINAL: 'UAS',
}

export const ASSESSMENT_TYPE_ORDER: AssessmentType[] = [
  'DAILY',
  'ASSIGNMENT',
  'PRACTICAL',
  'MIDTERM',
  'FINAL',
]

export const ASSESSMENT_WEIGHT_TOTAL = 100
