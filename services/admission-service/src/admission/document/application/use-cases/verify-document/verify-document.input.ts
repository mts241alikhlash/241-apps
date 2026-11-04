import type { AdmissionDocumentStatus } from '@mts241alikhlash/nest-core/domain'

export interface VerifyDocumentInput {
  applicationId: string
  documentId: string
  status: AdmissionDocumentStatus
  note?: string
  adminId: string
}
