import { SchoolUnitStatus } from '@mts241alikhlash/nest-core/domain'

export interface UpdateSchoolUnitInput {
  name?: string
  surname?: string
  nsm?: string
  npsn?: string
  status?: SchoolUnitStatus
  typeId?: string
  npwp?: string
  phone?: string
  email?: string
  website?: string
}
