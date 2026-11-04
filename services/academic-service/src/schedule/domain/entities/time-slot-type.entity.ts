import { DayEnum } from '@mts241alikhlash/nest-core/domain'

export interface TimeSlotTypeEntity {
  id: string
  code: string
  name: string
  isLesson: boolean
  days: DayEnum[] | string[]
  defaultDurationMinutes: number
  deletedAt?: Date | null
}
