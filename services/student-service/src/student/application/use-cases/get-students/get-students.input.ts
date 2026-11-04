import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'
import { StudentStatusEnum } from '@mts241alikhlash/nest-core/domain'

export interface StudentQueryInput extends PaginationQueryInput {
  search?: string
  semesterId?: string
  classroomId?: string
  status?: StudentStatusEnum
  isActive?: boolean
}
