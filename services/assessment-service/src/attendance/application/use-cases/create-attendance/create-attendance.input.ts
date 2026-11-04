import { AttendanceStatus } from '@mts241alikhlash/nest-core/domain'

export interface CreateAttendanceInput {
  enrollmentId: string
  scheduleId?: string
  date: string
  status: AttendanceStatus
  note?: string
}
