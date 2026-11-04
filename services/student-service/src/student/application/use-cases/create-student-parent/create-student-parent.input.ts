import { ParentRelation } from '@mts241alikhlash/nest-core/domain'

export interface CreateStudentParentInput {
  studentId: string
  parentId: string
  relation: ParentRelation
  isPrimary?: boolean
}
