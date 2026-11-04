import type { AdmissionPaymentStatus } from '@mts241alikhlash/nest-core/domain'
import type { DecimalValue } from '@mts241alikhlash/nest-core/domain'
import type { AdmissionFileRef } from '../../../document/index.js'

export interface AdmissionPaymentBankAccountRef {
  id: string
  bankName: string
  accountNumber: string
  accountHolder: string
}

export interface AdmissionPaymentWithProof {
  id: string
  applicationId: string
  amount: DecimalValue
  status: `${AdmissionPaymentStatus}`
  proofFileId: string | null
  proofFile?: AdmissionFileRef | null
  bankAccountId: string | null
  bankAccount?: AdmissionPaymentBankAccountRef | null
  note: string | null
  bankName: string | null
  senderAccountName: string | null
  transferDate: Date | null
  createdAt: Date
  updatedAt: Date
  verifiedById: string | null
  verifiedAt: Date | null
}
