import { UserGender } from '@mts241alikhlash/nest-core/domain'

export interface ProvisionAccountProfileInput {
  name: string
  nik: string
  gender: UserGender
  birthPlace: string
  birthDate: string
  email?: string
  phone?: string
}

export interface ProvisionAccountInput {
  identifier: string
  passwordHash: string
  roleCode?: string
  profile?: ProvisionAccountProfileInput
}
