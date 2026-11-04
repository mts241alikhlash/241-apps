import { DayEnum } from '@mts241alikhlash/nest-core/domain'
import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetSchedulesInput extends PaginationQueryInput {
  teachingAssignmentId?: string
  day?: DayEnum
  timeSlotId?: string
}
