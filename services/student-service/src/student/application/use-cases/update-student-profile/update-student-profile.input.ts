import { UserGender } from '@mts241alikhlash/nest-core/domain'

export interface UpdateStudentProfileInput {
  name?: string
  nik?: string
  gender?: `${UserGender}`
  birthPlace?: string
  birthDate?: string | Date
  religionId?: string | null
  email?: string | null
  phone?: string | null
  photo?: string | null
  bloodTypeId?: string | null
}
