import { UserGender } from '@mts241alikhlash/nest-core/domain'

export interface BulkImportStudentRowInput {
  identifier: string
  password: string
  name: string
  nik: string
  gender: UserGender
  birthPlace: string
  birthDate: string
  email?: string
  phone?: string
  grade?: number
  classroomCode?: string
  nis: string
  nisn: string
}

export interface ResolveBulkImportConflictInput {
  existingId?: string
  action: 'update' | 'skip'
  data: BulkImportStudentRowInput
}

export interface ResolveBulkImportConflictsInput {
  conflicts: ResolveBulkImportConflictInput[]
}
