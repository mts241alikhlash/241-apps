import { AttendanceStatus } from '@mts241alikhlash/nest-core/domain'

export interface UpdateAttendanceInput {
  status?: AttendanceStatus
  note?: string
}
