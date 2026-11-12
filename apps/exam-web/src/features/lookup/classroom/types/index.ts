import type { components as AcademicComponents } from '@mts241alikhlash/academic-api'
import type { components as StudentComponents } from '@mts241alikhlash/student-api'

export type Classroom =
  AcademicComponents['schemas']['ClassroomPageItemResponseDto']

export type StudentEnrollment =
  StudentComponents['schemas']['StudentEnrollmentListItemResponseDto']

export type EnrollmentStatus =
  'ACTIVE' | 'PROMOTED' | 'REPEATED' | 'TRANSFERRED' | 'DROPPED' | 'GRADUATED'

export interface ClassroomQueryParams {
  page?: number
  limit?: number
  academicYearId?: string
  gradeId?: string
  search?: string
  isActive?: boolean
}

export interface EnrollmentQueryParams {
  page?: number
  limit?: number
  studentId?: string
  classroomId?: string
  semesterId?: string
  academicYearId?: string
  status?: EnrollmentStatus
}
