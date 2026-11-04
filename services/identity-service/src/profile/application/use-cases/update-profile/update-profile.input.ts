import { MaritalStatus } from '@mts241alikhlash/nest-core/domain'
import { UserGender } from '@mts241alikhlash/nest-core/domain'

export interface UpdateProfileInput {
  name?: string
  nik?: string
  gender?: UserGender
  birthPlace?: string
  birthDate?: string
  email?: string
  phone?: string
  religionId?: string
  bloodTypeId?: string
  maritalStatus?: MaritalStatus
  noKk?: string
  npwp?: string
}
