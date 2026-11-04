import { StudentStatusEnum } from '@mts241alikhlash/nest-core/domain'

export interface UpdateStudentInput {
  nis?: string
  nisn?: string
  gradeId?: string
  status?: StudentStatusEnum
}
