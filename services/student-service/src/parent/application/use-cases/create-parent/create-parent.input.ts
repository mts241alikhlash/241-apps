import { IncomeRange } from '@mts241alikhlash/nest-core/domain'

export interface CreateParentInput {
  name: string
  nik: string
  birthPlace: string
  birthDate: string | Date
  email?: string
  phone?: string
  occupationId: string
  income?: IncomeRange
}
