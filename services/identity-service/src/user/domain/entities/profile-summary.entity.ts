import { UserGender } from '@mts241alikhlash/nest-core/domain'

export interface ProfileSummaryEntity {
  userId: string
  identifier: string
  isActive: boolean
  name: string
  gender: UserGender
  nik: string
  avatarStorageKey: string | null
  birthPlace: string
  birthDate: Date
  email: string | null
  phone: string | null
}
