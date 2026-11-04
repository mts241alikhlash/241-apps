import { DayEnum } from '@mts241alikhlash/nest-core/domain'

export interface UpdateScheduleInput {
  teachingAssignmentId?: string
  timeSlotId?: string
  day?: DayEnum
  room?: string
}
