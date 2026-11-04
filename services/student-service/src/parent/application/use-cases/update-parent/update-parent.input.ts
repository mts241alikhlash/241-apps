import { IncomeRange } from '@mts241alikhlash/nest-core/domain'

export interface UpdateParentInput {
  name?: string
  nik?: string
  birthPlace?: string
  birthDate?: string | Date
  email?: string
  phone?: string
  occupationId?: string
  income?: IncomeRange
}
