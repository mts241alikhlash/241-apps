import { DayEnum } from '@mts241alikhlash/nest-core/domain'

export interface UpdateTimeSlotTypeInput {
  code?: string
  name?: string
  isLesson?: boolean
  days?: DayEnum[]
  defaultDurationMinutes?: number
}
