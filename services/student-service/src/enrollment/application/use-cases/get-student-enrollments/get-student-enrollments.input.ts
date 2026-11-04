import { EnrollmentStatus } from '@mts241alikhlash/nest-core/domain'
import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetStudentEnrollmentsInput extends PaginationQueryInput {
  studentId?: string
  classroomId?: string
  semesterId?: string
  academicYearId?: string
  status?: EnrollmentStatus
}
