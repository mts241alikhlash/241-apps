export type AssessmentType =
  'DAILY' | 'MIDTERM' | 'FINAL' | 'ASSIGNMENT' | 'PRACTICAL'

export interface AssessmentItem {
  id: string
  teachingAssignmentId: string
  name: string
  type: AssessmentType
  weight: number
  maxScore: number
  gradedCount?: number
  studentCount?: number
  teachingAssignment?: {
    id: string
    subject?: {
      id: string
      code: string | null
      name: string
    }
    classroom?: {
      id: string
      code: string
      name: string | null
    }
  }
  createdAt: string
  updatedAt: string
}
