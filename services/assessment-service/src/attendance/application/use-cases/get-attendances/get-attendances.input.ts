import { AttendanceStatus } from '@mts241alikhlash/nest-core/domain'
import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetAttendancesInput extends PaginationQueryInput {
  status?: AttendanceStatus
  enrollmentId?: string
  scheduleId?: string
  classroomId?: string
  semesterId?: string
  date?: string
}
