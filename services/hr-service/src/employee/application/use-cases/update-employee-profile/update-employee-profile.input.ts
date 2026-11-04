import { UserGender } from '@mts241alikhlash/nest-core/domain'

export interface UpdateEmployeeProfileInput {
  name?: string
  nik?: string
  gender?: UserGender
  birthPlace?: string
  birthDate?: string | Date
  email?: string | null
  phone?: string | null
  religion?: string | null
  nationality?: string | null
}
