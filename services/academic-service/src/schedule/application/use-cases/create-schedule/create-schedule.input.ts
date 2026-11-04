import { DayEnum } from '@mts241alikhlash/nest-core/domain'

export interface CreateScheduleInput {
  teachingAssignmentId: string
  timeSlotId: string
  day: DayEnum
  room?: string
}
