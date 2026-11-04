import { UserGender } from '@mts241alikhlash/nest-core/domain'

export interface CreateStudentInput {
  identifier?: string
  password?: string
  name: string
  nik: string
  gender: UserGender
  birthPlace: string
  birthDate: string
  email?: string
  phone?: string
  gradeId?: string
  classroomId?: string
  nis?: string
  nisn?: string
}
