import { EnrollmentStatus } from '@mts241alikhlash/nest-core/domain'

export interface UpdateStudentEnrollmentInput {
  studentId?: string
  classroomId?: string
  semesterId?: string
  status?: EnrollmentStatus
  endedAt?: string
  note?: string
}
