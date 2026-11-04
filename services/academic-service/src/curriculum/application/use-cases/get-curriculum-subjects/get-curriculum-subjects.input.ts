import { PaginationQueryInput } from '@mts241alikhlash/nest-core/domain'

export interface GetCurriculumSubjectsInput extends PaginationQueryInput {
  curriculumId?: string
  subjectId?: string
}
