import type { components } from '@mts241alikhlash/academic-api'

export type TeachingAssignment =
  components['schemas']['TeachingAssignmentPageItemResponseDto']

export interface TeachingAssignmentQueryParams {
  page?: number
  limit?: number
  employeeId?: string
  classroomId?: string
  subjectId?: string
  semesterId?: string
}
