import { UserGender } from '@mts241alikhlash/nest-core/domain'

export interface CreateEmployeeInput {
  identifier?: string
  password?: string
  name: string
  nik: string
  gender: UserGender
  birthPlace: string
  birthDate: string | Date
  email?: string
  phone?: string
  nip?: string
  nuptk?: string
  employmentTypeId: string
  positionId?: string
}
