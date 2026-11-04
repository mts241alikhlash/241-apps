import type { AdmissionPaymentStatus } from '@mts241alikhlash/nest-core/domain'

export interface VerifyPaymentInput {
  applicationId: string
  status: AdmissionPaymentStatus
  note?: string
  adminId: string
}
