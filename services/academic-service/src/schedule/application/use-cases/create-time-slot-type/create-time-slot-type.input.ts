import { DayEnum } from '@mts241alikhlash/nest-core/domain'

export interface CreateTimeSlotTypeInput {
  code: string
  name: string
  isLesson?: boolean
  days?: DayEnum[]
  defaultDurationMinutes?: number
}
