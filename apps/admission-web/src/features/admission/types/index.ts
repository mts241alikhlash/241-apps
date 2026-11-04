import type { components as AcademicSchemas } from '@mts241alikhlash/academic-api'
import type { components } from '@mts241alikhlash/admission-api'

type Schemas = components['schemas']

export type AdmissionDocumentType =
  Schemas['AdmissionActiveWavesResponseDocumentTypesDto'] & {
    dueDate?: string | null
  }
export type AdmissionFile = Schemas['AdmissionPaymentResponseProofFileDto']
export type AdmissionApplicationParent =
  Schemas['MyAdmissionApplicationResponseParentsDto']
export type AdmissionWaveSummary = Schemas['AdmissionWaveSummaryResponseDto']
export type AdmissionBankAccount = Schemas['AdmissionBankAccountResponseDto']
export interface BankAccountSavePayload {
  bankName: string
  accountNumber: string
  accountHolder: string
  isActive: boolean
}
export type AdmissionDocumentTypeAdmin =
  Schemas['AdmissionDocumentTypeResponseDto']
export type DocumentRequirement = 'REQUIRED' | 'LATER' | 'OPTIONAL'
export type LateDocumentRow = Schemas['AdmissionLateDocumentRowResponseDto']
export type LateDocumentList = Schemas['AdmissionLateDocumentListResponseDto']
export type LateDocumentState = LateDocumentRow['state']
export type LateDocumentStateFilter = 'OPEN' | LateDocumentState
export interface LateDocumentQuery {
  page: number
  limit: number
  search?: string
  documentTypeId?: string
  waveId?: string
  state?: LateDocumentStateFilter
}
export type AdmissionPaymentQueueRow =
  Schemas['AdmissionPaymentQueueRowResponseDto']
export type AdmissionPaymentQueue = Schemas['AdmissionPaymentQueueResponseDto']
export type AdmissionEligibleApplication =
  Schemas['AdmissionEligibleApplicationResponseDto']
export type PaymentQueueStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'
export interface PaymentQueueQuery {
  status: PaymentQueueStatus
  search?: string
  waveId?: string
  page: number
  limit: number
}
export type AdmissionDocumentReviewRow =
  Schemas['AdmissionDocumentReviewRowResponseDto'] & {
    revisionNote?: string | null
  }
export type AdmissionDocumentReview =
  Schemas['AdmissionDocumentReviewResponseDto']
export type AdmissionDocumentReviewSlot =
  Schemas['AdmissionDocumentReviewSlotDto']
export type AdmissionDocumentReviewSend =
  Schemas['AdmissionDocumentReviewSendResponseDto']
export type AdmissionDocumentReviewQueue =
  Schemas['AdmissionDocumentReviewQueueResponseDto']
export type DocumentReviewTab = 'waiting' | 'revision' | 'done'
export interface DocumentReviewQuery {
  tab: DocumentReviewTab
  search?: string
  waveId?: string
  page: number
  limit: number
}
export type AdmissionDecisionRow = Schemas['AdmissionDecisionRowResponseDto']
export type AdmissionDecisionQueue =
  Schemas['AdmissionDecisionQueueResponseDto']
export type AdmissionDecision = Schemas['AdmissionDecisionResponseDto']
export type AdmissionDecisionMany = Schemas['AdmissionDecisionManyResponseDto']
export type DecisionTab = 'waiting' | 'accepted' | 'rejected'
export interface DecisionQueueQuery {
  tab: DecisionTab
  search?: string
  waveId?: string
  page: number
  limit: number
}
export type AdmissionGrade = Schemas['AdmissionGradeResponseDto']
export type AdmissionEnrollmentRow =
  Schemas['AdmissionEnrollmentRowResponseDto']
export type AdmissionEnrollmentQueue =
  Schemas['AdmissionEnrollmentQueueResponseDto']
export type AdmissionNisPreview = Schemas['AdmissionNisPreviewResponseDto']
export type AdmissionNisCompose = Schemas['AdmissionNisComposeResponseDto']
export type AdmissionEnrollmentProcess =
  Schemas['AdmissionEnrollmentProcessResponseDto']
export type AdmissionType = 'NEW' | 'TRANSFER'
export const ADMISSION_TYPE_LABELS: Record<AdmissionType, string> = {
  NEW: 'Siswa baru',
  TRANSFER: 'Pindahan',
}
export type EnrollmentTab = 'ready' | 'held' | 'done'
export interface EnrollmentQueueQuery {
  tab: EnrollmentTab
  search?: string
  waveId?: string
  page: number
  limit: number
}
export interface AddPaymentPayload {
  applicationId: string
  bankAccountId: string
  bankName: string
  senderAccountName: string
  transferDate: string
}
export interface DocumentTypeSavePayload {
  name: string
  requirement: DocumentRequirement
  lateDueMonths: number | null
  isActive: boolean
}
export type AdmissionDownloadAdmin = Schemas['AdmissionDownloadResponseDto']
export type AdmissionActiveDownload =
  Schemas['AdmissionActiveDownloadResponseDto']
export interface DownloadSavePayload {
  title: string
  description: string
  isActive: boolean
  file: File | null
}
export type AdmissionWave = Schemas['AdmissionWaveResponseDto']
export type ActiveWave = Schemas['AdmissionActiveWavesResponseWavesDto']
export type ActiveWaves = Schemas['AdmissionActiveWavesResponseDto']
export type AdmissionApplication =
  Schemas['MyAdmissionApplicationResponseDto'] &
    Partial<
      Pick<
        Schemas['AdmissionApplicationReviewResponseDto'],
        'duplicateNikCount' | 'admissionType' | 'targetGradeLevel' | 'nis'
      >
    >
export type AdmissionDocument = NonNullable<
  AdmissionApplication['documents']
>[number]
export type AdmissionPayment = NonNullable<AdmissionApplication['payment']>
export type AdmissionDocumentUpload = Schemas['AdmissionDocumentResponseDto']
export type AdmissionPaymentUpload = Schemas['AdmissionPaymentResponseDto']
export type AdmissionNotificationsRead =
  Schemas['AdmissionNotificationsReadResponseDto']
export type AdmissionApplicationReview =
  Schemas['AdmissionApplicationReviewResponseDto']
export type AdmissionApplicationForm =
  Schemas['AdmissionApplicationFormResponseDto']
export type AdmissionApplicationDecision =
  Schemas['AdmissionApplicationResponseDto']
export type AdmissionAcceptedApplication =
  Schemas['AdmissionAcceptedApplicationResponseDto']
export type AdmissionEnrolledApplication =
  Schemas['AdmissionEnrolledApplicationResponseDto']
export type AdmissionRegisteredApplicant =
  Schemas['AdmissionRegisteredApplicantResponseDto']
export type AdmissionApplicationListItem =
  Schemas['AdmissionApplicationSummaryResponseDto']
export type AdmissionNotification = Schemas['AdmissionNotificationResponseDto']
export type AdmissionNotificationList =
  Schemas['AdmissionNotificationListResponseDto']
export type AdmissionAnnouncement = Schemas['AdmissionAnnouncementResponseDto']
export type AdmissionStats = Schemas['AdmissionStatsResponseDto']
export type AdmissionAcademicYear =
  AcademicSchemas['schemas']['AcademicYearResponseDto']

export type AdmissionFormOptions = Schemas['AdmissionFormOptionsResponseDto']
export type AdmissionFormOptionKey = Exclude<
  keyof AdmissionFormOptions,
  'bankAccounts'
>
export type AdmissionAchievement = NonNullable<
  AdmissionApplication['achievements']
>[number]
export type AdmissionScholarship = NonNullable<
  AdmissionApplication['scholarships']
>[number]
export type AdmissionAttachmentUpload =
  Schemas['AdmissionAttachmentResponseDto']

export interface RegionNode {
  code: string
  name: string
  level: 'PROVINCE' | 'REGENCY' | 'DISTRICT' | 'VILLAGE'
  parentCode: string | null
}

export type AdmissionStatus = AdmissionApplication['status']
export type AdmissionDocumentStatus = AdmissionDocument['status']
export type AdmissionPaymentStatus = AdmissionPayment['status']
export type AdmissionNotificationType = AdmissionNotification['type']
export type ParentRelation = AdmissionApplicationParent['relation']
export type UserGender = NonNullable<AdmissionApplication['gender']>

export interface AdmissionApplicationParentInput {
  id?: string
  relation: ParentRelation
  name: string
  nik?: string | null
  birthPlace?: string | null
  birthDate?: string | null
  phone?: string | null
  occupationId?: string | null
  educationId?: string | null
  incomeRangeId?: string | null
  isPrimary: boolean
}

export interface PublicRegisterPayload {
  fullName: string
  email: string
  phone?: string
  password: string
  passwordConfirm: string
  admissionType?: AdmissionType
  targetGradeId?: string
}

export interface RegisterPayload {
  fullName: string
  email: string
  phone?: string
  password: string
  passwordConfirm: string
  waveId: string
  admissionType?: AdmissionType
  targetGradeId?: string
}

export type UpdateMyApplicationDto = Schemas['UpdateMyApplicationDto']

export type UpdateApplicationPayload = UpdateMyApplicationDto

export interface WaveSavePayload {
  name: string
  code: string
  academicYearId: string
  startDate: string
  endDate: string
  quota: number
  registrationFee: number
  description?: string
  isActive?: boolean
}

export interface AnnouncementSavePayload {
  title: string
  content: string
  waveId?: string
  isPublished?: boolean
}

export const STATUS_LABELS: Record<AdmissionStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Menunggu Verifikasi',
  REVISION_NEEDED: 'Perlu Revisi',
  VERIFIED: 'Terverifikasi',
  ACCEPTED: 'Diterima',
  REJECTED: 'Ditolak',
  ENROLLING: 'Sedang Didaftarkan',
  ENROLLED: 'Terdaftar sebagai Santri',
}

export const PAYMENT_STATUS_LABELS: Record<AdmissionPaymentStatus, string> = {
  UNPAID: 'Belum Bayar',
  PENDING: 'Menunggu Verifikasi',
  VERIFIED: 'Terverifikasi',
  REJECTED: 'Ditolak',
}

export const DOCUMENT_STATUS_LABELS: Record<AdmissionDocumentStatus, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
}

export const RELATION_LABELS: Record<ParentRelation, string> = {
  FATHER: 'Ayah',
  MOTHER: 'Ibu',
  GUARDIAN: 'Wali',
}

export interface PreviewFile {
  id: string
  originalName: string
  mimeType: string
}
