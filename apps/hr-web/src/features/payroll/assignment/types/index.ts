import type { components } from '@mts241alikhlash/hr-api'

export type SalaryAssignment =
  components['schemas']['SalaryAssignmentResponseDto']

export interface SalaryAssignmentSavePayload {
  userId: string
  componentId: string
  amount?: string | null
  rate?: string | null
  effectiveFrom: string
}

export interface EmployeeOption {
  userId: string
  name: string
  identifier: string
}
