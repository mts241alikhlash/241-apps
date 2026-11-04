import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetClassroomStructuresInput extends PaginationQueryInput {
  classroomId?: string
  semesterId?: string
}
