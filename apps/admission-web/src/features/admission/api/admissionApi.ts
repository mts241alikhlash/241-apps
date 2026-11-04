import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import type {
  LandingDraftOverview,
  LandingImagePurpose,
  LandingPublished,
  LandingSectionKey,
} from '../types/landing'
import type {
  ActiveWaves,
  AdmissionActiveDownload,
  AdmissionBankAccount,
  AdmissionDocumentTypeAdmin,
  AdmissionDownloadAdmin,
  BankAccountSavePayload,
  DocumentTypeSavePayload,
  DownloadSavePayload,
  AddPaymentPayload,
  AdmissionEligibleApplication,
  AdmissionPaymentQueue,
  LateDocumentList,
  LateDocumentQuery,
  AdmissionDecision,
  AdmissionDecisionMany,
  AdmissionDecisionQueue,
  AdmissionDocumentReview,
  AdmissionDocumentReviewQueue,
  AdmissionDocumentReviewSend,
  DecisionQueueQuery,
  AdmissionGrade,
  AdmissionEnrollmentQueue,
  AdmissionNisPreview,
  AdmissionNisCompose,
  AdmissionEnrollmentProcess,
  AdmissionType,
  EnrollmentQueueQuery,
  DocumentReviewQuery,
  PaymentQueueQuery,
  AdmissionAcademicYear,
  AdmissionAcceptedApplication,
  AdmissionAnnouncement,
  AdmissionApplication,
  AdmissionApplicationDecision,
  AdmissionApplicationForm,
  AdmissionApplicationListItem,
  AdmissionApplicationReview,
  AdmissionAttachmentUpload,
  AdmissionDocumentUpload,
  AdmissionEnrolledApplication,
  AdmissionFormOptions,
  AdmissionNotification,
  AdmissionNotificationList,
  AdmissionNotificationsRead,
  AdmissionPaymentUpload,
  AdmissionRegisteredApplicant,
  AdmissionStats,
  AdmissionWave,
  AdmissionWaveSummary,
  AnnouncementSavePayload,
  PublicRegisterPayload,
  RegionNode,
  RegisterPayload,
  UpdateApplicationPayload,
  WaveSavePayload,
} from '../types'

function downloadForm(payload: DownloadSavePayload) {
  const formData = new FormData()
  formData.append('title', payload.title)
  formData.append('description', payload.description)
  formData.append('isActive', String(payload.isActive))
  if (payload.file) formData.append('file', payload.file)
  return formData
}

export const admissionApi = {
  getActiveWaves: () =>
    api.get<ApiSingleResponse<ActiveWaves>>('/admissions/waves/active'),

  register: (payload: PublicRegisterPayload) =>
    api.post<ApiSingleResponse<AdmissionRegisteredApplicant>>(
      '/admissions/register',
      payload,
    ),

  adminRegisterApplicant: (payload: RegisterPayload) =>
    api.post<ApiSingleResponse<AdmissionRegisteredApplicant>>(
      '/admissions/applications',
      payload,
    ),

  adminUpdateApplication: (id: string, payload: UpdateApplicationPayload) =>
    api.patch<ApiSingleResponse<AdmissionApplicationForm>>(
      `/admissions/applications/${id}/form`,
      payload,
    ),

  adminSubmitApplication: (id: string) =>
    api.post<ApiSingleResponse<AdmissionApplicationForm>>(
      `/admissions/applications/${id}/submit`,
    ),

  adminUploadDocument: (id: string, typeCode: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.put<ApiSingleResponse<AdmissionDocumentUpload>>(
      `/admissions/applications/${id}/documents/${typeCode}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  adminUploadPaymentProof: (
    id: string,
    payload: {
      bankName: string
      bankAccountId: string
      senderAccountName: string
      transferDate?: string
    },
    file: File,
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bankName', payload.bankName)
    formData.append('bankAccountId', payload.bankAccountId)
    formData.append('senderAccountName', payload.senderAccountName)
    if (payload.transferDate) {
      formData.append('transferDate', payload.transferDate)
    }
    return api.put<ApiSingleResponse<AdmissionPaymentUpload>>(
      `/admissions/applications/${id}/payment`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  getFormOptions: () =>
    api.get<ApiSingleResponse<AdmissionFormOptions>>(
      '/admissions/form-options',
    ),

  uploadAttachment: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ApiSingleResponse<AdmissionAttachmentUpload>>(
      '/admissions/my-application/attachments',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  adminUploadAttachment: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ApiSingleResponse<AdmissionAttachmentUpload>>(
      `/admissions/applications/${id}/attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  getProvinces: () =>
    api.get<ApiSingleResponse<RegionNode[]>>('/regions/provinces'),

  getRegionChildren: (code: string) =>
    api.get<ApiSingleResponse<RegionNode[]>>(`/regions/${code}/children`),

  getMyApplication: () =>
    api.get<ApiSingleResponse<AdmissionApplication>>(
      '/admissions/my-application',
    ),

  ensureMyApplication: () =>
    api.post<ApiSingleResponse<AdmissionApplication>>(
      '/admissions/my-application/ensure',
    ),

  updateMyApplication: (payload: UpdateApplicationPayload) =>
    api.patch<ApiSingleResponse<AdmissionApplicationForm>>(
      '/admissions/my-application',
      payload,
    ),

  submitMyApplication: () =>
    api.post<ApiSingleResponse<AdmissionApplicationForm>>(
      '/admissions/my-application/submit',
    ),

  uploadDocument: (typeCode: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.put<ApiSingleResponse<AdmissionDocumentUpload>>(
      `/admissions/my-application/documents/${typeCode}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  uploadPaymentProof: (
    payload: {
      bankName: string
      bankAccountId: string
      senderAccountName: string
      transferDate?: string
    },
    file: File,
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bankName', payload.bankName)
    formData.append('bankAccountId', payload.bankAccountId)
    formData.append('senderAccountName', payload.senderAccountName)
    if (payload.transferDate) {
      formData.append('transferDate', payload.transferDate)
    }
    return api.put<ApiSingleResponse<AdmissionPaymentUpload>>(
      '/admissions/my-application/payment',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  getMyNotifications: () =>
    api.get<AdmissionNotificationList>(
      '/admissions/my-application/notifications',
    ),

  markNotificationRead: (id: string) =>
    api.patch<ApiSingleResponse<AdmissionNotification>>(
      `/admissions/notifications/${id}/read`,
    ),

  markAllNotificationsRead: () =>
    api.patch<ApiSingleResponse<AdmissionNotificationsRead>>(
      '/admissions/notifications/read-all',
    ),

  getAnnouncements: () =>
    api.get<ApiSingleResponse<AdmissionAnnouncement[]>>(
      '/admissions/announcements',
    ),

  getStats: (params: { waveId?: string; academicYearId?: string }) =>
    api.get<ApiSingleResponse<AdmissionStats>>('/admissions/stats', {
      params,
    }),

  getApplications: (params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    waveId?: string
  }) =>
    api.get<ApiPaginatedResponse<AdmissionApplicationListItem>>(
      '/admissions/applications',
      { params },
    ),

  getApplicationById: (id: string) =>
    api.get<ApiSingleResponse<AdmissionApplicationReview>>(
      `/admissions/applications/${id}`,
    ),

  verifyDocument: (
    applicationId: string,
    documentId: string,
    payload: { status: 'APPROVED' | 'REJECTED'; note?: string },
  ) =>
    api.patch<ApiSingleResponse<AdmissionDocumentUpload>>(
      `/admissions/applications/${applicationId}/documents/${documentId}/verify`,
      payload,
    ),

  verifyPayment: (
    applicationId: string,
    payload: { status: 'VERIFIED' | 'REJECTED'; note?: string },
  ) =>
    api.patch<ApiSingleResponse<AdmissionPaymentUpload>>(
      `/admissions/applications/${applicationId}/payment/verify`,
      payload,
    ),

  requestRevision: (applicationId: string, note: string) =>
    api.post<ApiSingleResponse<AdmissionApplicationDecision>>(
      `/admissions/applications/${applicationId}/request-revision`,
      { note },
    ),

  verifyApplication: (applicationId: string) =>
    api.post<ApiSingleResponse<AdmissionApplicationDecision>>(
      `/admissions/applications/${applicationId}/verify`,
    ),

  acceptApplication: (applicationId: string, note?: string) =>
    api.post<ApiSingleResponse<AdmissionAcceptedApplication>>(
      `/admissions/applications/${applicationId}/accept`,
      { note },
    ),

  rejectApplication: (applicationId: string, reason: string) =>
    api.post<ApiSingleResponse<AdmissionApplicationDecision>>(
      `/admissions/applications/${applicationId}/reject`,
      { reason },
    ),

  enrollApplicant: (
    applicationId: string,
    payload: {
      nis?: string
      nisn?: string
      gradeId?: string
      classroomId?: string
    },
  ) =>
    api.post<ApiSingleResponse<AdmissionEnrolledApplication>>(
      `/admissions/applications/${applicationId}/enroll`,
      payload,
    ),

  getAcademicYears: () =>
    api.get<ApiPaginatedResponse<AdmissionAcademicYear>>('/academic-years', {
      params: { limit: 100 },
    }),

  getWaves: (params?: {
    page?: number
    limit?: number
    search?: string
    academicYearId?: string
    isActive?: string
  }) =>
    api.get<ApiPaginatedResponse<AdmissionWaveSummary>>('/admissions/waves', {
      params,
    }),

  createWave: (payload: WaveSavePayload) =>
    api.post<ApiSingleResponse<AdmissionWave>>('/admissions/waves', payload),

  updateWave: (id: string, payload: Partial<WaveSavePayload>) =>
    api.patch<ApiSingleResponse<AdmissionWave>>(
      `/admissions/waves/${id}`,
      payload,
    ),

  deleteWave: (id: string) => api.delete<void>(`/admissions/waves/${id}`),

  getBankAccounts: () =>
    api.get<{ data: AdmissionBankAccount[] }>('/admissions/bank-accounts'),

  createBankAccount: (payload: BankAccountSavePayload) =>
    api.post<ApiSingleResponse<AdmissionBankAccount>>(
      '/admissions/bank-accounts',
      payload,
    ),

  updateBankAccount: (id: string, payload: Partial<BankAccountSavePayload>) =>
    api.patch<ApiSingleResponse<AdmissionBankAccount>>(
      `/admissions/bank-accounts/${id}`,
      payload,
    ),

  deleteBankAccount: (id: string) =>
    api.delete<void>(`/admissions/bank-accounts/${id}`),

  getDocumentTypes: () =>
    api.get<{ data: AdmissionDocumentTypeAdmin[] }>(
      '/admissions/document-types',
    ),

  createDocumentType: (payload: DocumentTypeSavePayload) =>
    api.post<ApiSingleResponse<AdmissionDocumentTypeAdmin>>(
      '/admissions/document-types',
      payload,
    ),

  updateDocumentType: (id: string, payload: Partial<DocumentTypeSavePayload>) =>
    api.patch<ApiSingleResponse<AdmissionDocumentTypeAdmin>>(
      `/admissions/document-types/${id}`,
      payload,
    ),

  deleteDocumentType: (id: string) =>
    api.delete<void>(`/admissions/document-types/${id}`),

  getDownloads: () =>
    api.get<{ data: AdmissionDownloadAdmin[] }>('/admissions/downloads'),

  createDownload: (payload: DownloadSavePayload) =>
    api.post<ApiSingleResponse<AdmissionDownloadAdmin>>(
      '/admissions/downloads',
      downloadForm(payload),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),

  updateDownload: (id: string, payload: DownloadSavePayload) =>
    api.patch<ApiSingleResponse<AdmissionDownloadAdmin>>(
      `/admissions/downloads/${id}`,
      downloadForm(payload),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),

  reorderDownloads: (ids: string[]) =>
    api.put<{ data: AdmissionDownloadAdmin[] }>('/admissions/downloads/order', {
      ids,
    }),

  deleteDownload: (id: string) =>
    api.delete<void>(`/admissions/downloads/${id}`),

  getActiveDownloads: () =>
    api.get<{ data: AdmissionActiveDownload[] }>(
      '/admissions/downloads/active',
    ),

  downloadFileUrl: (id: string) =>
    `${api.defaults.baseURL ?? ''}/admissions/downloads/${id}/file`,

  getLandingPublished: () =>
    api.get<{ data: LandingPublished }>('/admissions/landing'),

  getLandingDraft: () =>
    api.get<{ data: LandingDraftOverview }>('/admissions/landing/draft'),

  saveLandingSection: (key: LandingSectionKey, content: unknown) =>
    api.put<{ data: LandingDraftOverview }>(
      `/admissions/landing/sections/${key}`,
      { content },
    ),

  uploadLandingImage: (file: File, purpose: LandingImagePurpose) => {
    const formData = new FormData()
    formData.append('purpose', purpose)
    formData.append('file', file)
    return api.post<{
      data: { id: string; width: number; height: number; sizeBytes: number }
    }>('/admissions/landing/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  publishLanding: () =>
    api.post<{ data: LandingDraftOverview }>('/admissions/landing/publish'),

  discardLanding: () =>
    api.post<{ data: LandingDraftOverview }>('/admissions/landing/discard'),

  landingImageUrl: (id: string) =>
    `${api.defaults.baseURL ?? ''}/admissions/landing/images/${id}`,

  getPaymentQueue: (params: PaymentQueueQuery) =>
    api.get<AdmissionPaymentQueue>('/admissions/payments', { params }),

  getEligiblePaymentApplications: (search?: string) =>
    api.get<{ data: AdmissionEligibleApplication[] }>(
      '/admissions/payments/eligible-applications',
      { params: { search: search || undefined } },
    ),

  verifyQueuePayment: (
    applicationId: string,
    payload: { status: 'VERIFIED' | 'REJECTED'; note?: string },
  ) => api.patch(`/admissions/payments/${applicationId}/verify`, payload),

  cancelPaymentVerification: (applicationId: string, note: string) =>
    api.post(`/admissions/payments/${applicationId}/cancel`, { note }),

  addPayment: (payload: AddPaymentPayload, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('applicationId', payload.applicationId)
    formData.append('bankAccountId', payload.bankAccountId)
    formData.append('bankName', payload.bankName)
    formData.append('senderAccountName', payload.senderAccountName)
    formData.append('transferDate', payload.transferDate)
    return api.post('/admissions/payments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getLateDocuments: (params: LateDocumentQuery) =>
    api.get<LateDocumentList>('/admissions/late-documents', { params }),

  uploadLateDocument: (
    applicationId: string,
    documentTypeId: string,
    file: File,
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(
      `/admissions/late-documents/${applicationId}/documents/${documentTypeId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  decideLateDocument: (
    applicationId: string,
    documentId: string,
    payload: { status: 'APPROVED' | 'REJECTED'; note?: string },
  ) =>
    api.patch(
      `/admissions/late-documents/${applicationId}/documents/${documentId}`,
      payload,
    ),

  getManageAnnouncements: (params?: {
    page?: number
    limit?: number
    search?: string
    waveId?: string
    isPublished?: string
  }) =>
    api.get<ApiPaginatedResponse<AdmissionAnnouncement>>(
      '/admissions/manage-announcements',
      { params },
    ),

  createAnnouncement: (payload: AnnouncementSavePayload) =>
    api.post<ApiSingleResponse<AdmissionAnnouncement>>(
      '/admissions/manage-announcements',
      payload,
    ),

  updateAnnouncement: (id: string, payload: Partial<AnnouncementSavePayload>) =>
    api.patch<ApiSingleResponse<AdmissionAnnouncement>>(
      `/admissions/manage-announcements/${id}`,
      payload,
    ),

  publishAnnouncement: (id: string) =>
    api.post<ApiSingleResponse<AdmissionAnnouncement>>(
      `/admissions/manage-announcements/${id}/publish`,
    ),

  deleteAnnouncement: (id: string) =>
    api.delete<void>(`/admissions/manage-announcements/${id}`),

  getFile: (fileId: string, download = false) =>
    api.get<Blob>(`/admissions/files/${fileId}`, {
      params: download ? { download: 1 } : undefined,
      responseType: 'blob',
    }),

  getDocumentReviews: (params: DocumentReviewQuery) =>
    api.get<AdmissionDocumentReviewQueue>('/admissions/document-reviews', {
      params,
    }),

  getDocumentReview: (applicationId: string) =>
    api.get<ApiSingleResponse<AdmissionDocumentReview>>(
      `/admissions/document-reviews/${applicationId}`,
    ),

  saveDocumentDecision: (
    applicationId: string,
    documentId: string,
    payload: { status: 'APPROVED' | 'REJECTED'; note?: string },
  ) =>
    api.patch(
      `/admissions/document-reviews/${applicationId}/documents/${documentId}`,
      payload,
    ),

  sendDocumentReview: (applicationId: string, payload: { dataNote?: string }) =>
    api.post<ApiSingleResponse<AdmissionDocumentReviewSend>>(
      `/admissions/document-reviews/${applicationId}/send`,
      payload,
    ),

  getDecisionQueue: (params: DecisionQueueQuery) =>
    api.get<AdmissionDecisionQueue>('/admissions/decisions', { params }),

  acceptDecision: (applicationId: string, note?: string) =>
    api.post(`/admissions/decisions/${applicationId}/accept`, { note }),

  rejectDecision: (applicationId: string, reason: string) =>
    api.post(`/admissions/decisions/${applicationId}/reject`, { reason }),

  acceptManyDecisions: (applicationIds: string[], note?: string) =>
    api.post<ApiSingleResponse<AdmissionDecisionMany>>(
      '/admissions/decisions/accept-many',
      { applicationIds, note },
    ),

  cancelAcceptance: (applicationId: string, reason: string) =>
    api.post(`/admissions/decisions/${applicationId}/cancel-acceptance`, {
      reason,
    }),

  cancelRejection: (applicationId: string, reason: string) =>
    api.post<ApiSingleResponse<AdmissionDecision>>(
      `/admissions/decisions/${applicationId}/cancel-rejection`,
      { reason },
    ),

  getGrades: () =>
    api.get<ApiSingleResponse<AdmissionGrade[]>>('/admissions/grades'),

  getEnrollmentQueue: (params: EnrollmentQueueQuery) =>
    api.get<AdmissionEnrollmentQueue>('/admissions/enrollments', { params }),

  getNisPreview: (academicYearId: string) =>
    api.get<ApiSingleResponse<AdmissionNisPreview>>(
      '/admissions/enrollments/nis-preview',
      { params: { academicYearId } },
    ),

  composeNis: (payload: {
    academicYearId: string
    expectedChanges: number
    syncStudents?: boolean
  }) =>
    api.post<ApiSingleResponse<AdmissionNisCompose>>(
      '/admissions/enrollments/nis',
      payload,
    ),

  lockNis: (academicYearId: string) =>
    api.post('/admissions/enrollments/nis-lock', { academicYearId }),

  processEnrollments: (payload: {
    applicationIds: string[]
    nisn: { applicationId: string; nisn: string }[]
  }) =>
    api.post<ApiSingleResponse<AdmissionEnrollmentProcess>>(
      '/admissions/enrollments/process',
      payload,
    ),

  setPlacement: (
    applicationId: string,
    payload: { admissionType: AdmissionType; targetGradeId: string },
  ) => api.patch(`/admissions/enrollments/${applicationId}/placement`, payload),
}
