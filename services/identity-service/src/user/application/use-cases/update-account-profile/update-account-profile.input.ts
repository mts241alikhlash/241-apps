import { UserGender } from '@mts241alikhlash/nest-core/domain'

export interface UpdateAccountProfileInput {
  name?: string
  nik?: string
  gender?: UserGender
  birthPlace?: string
  birthDate?: string
  email?: string
  phone?: string
}
