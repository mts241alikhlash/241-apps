import { AttendanceStatus } from '@mts241alikhlash/nest-core/domain'

export interface BulkAttendanceRecordInput {
  enrollmentId: string
  status: AttendanceStatus
  note?: string
}

export interface BulkUpsertAttendanceInput {
  date: string
  scheduleId?: string
  records: BulkAttendanceRecordInput[]
}
