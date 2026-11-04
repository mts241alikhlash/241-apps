import { ParentRelation } from '@mts241alikhlash/nest-core/domain'

export interface UpdateStudentParentInput {
  parentId?: string
  relation?: ParentRelation
  isPrimary?: boolean
}
