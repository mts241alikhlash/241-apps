import { DayEnum } from '@mts241alikhlash/nest-core/domain'

export interface BatchScheduleRowInput {
  timeSlotId: string
  subjectId: string
}

export interface BatchUpsertScheduleInput {
  day: DayEnum
  lessons: BatchScheduleRowInput[]
}
