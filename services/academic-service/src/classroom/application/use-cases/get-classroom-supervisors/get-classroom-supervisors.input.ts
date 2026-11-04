import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetClassroomSupervisorsInput extends PaginationQueryInput {
  classroomId?: string
  employeeId?: string
  semesterId?: string
}
