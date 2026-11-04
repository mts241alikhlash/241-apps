import type { QuestionContent, QuestionType } from '@/features/exam-bank/types'

export const PACKAGE_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'RETURNED',
  'APPROVED',
  'LOCKED',
] as const

export type ExamPackageStatus = (typeof PACKAGE_STATUSES)[number]

export type QuestionMarker = 'NEW' | 'CHANGED' | 'COPIED'

export const RESOLUTIONS = ['NORMAL', 'BONUS_ALL', 'KEY_OVERRIDE'] as const

export type ItemResolution = (typeof RESOLUTIONS)[number]

export interface AdjustKeyPayload {
  resolution: ItemResolution
  overrideContent?: unknown
  reason: string
}

export interface AdjustedKey {
  packageId: string
  questionId: string
  resolution: ItemResolution
  rescoredSessions: number
}

export interface ExamPackageSummary {
  id: string
  title: string
  subjectId: string
  gradeId: string
  status: ExamPackageStatus
  lockedAt: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  itemCount: number
}

export interface ExamPackageItemView {
  questionId: string
  questionVersion: number
  position: number
  type: QuestionType
  marker: QuestionMarker
  summary: string
  points: number
}

export interface PackageQuestionNote {
  questionId: string
  note: string
}

export interface PackageReview {
  id: string
  action: 'SUBMIT' | 'APPROVE' | 'RETURN'
  byUserId: string
  note: string | null
  questionNotes: PackageQuestionNote[]
  createdAt: string
}

export interface ExamPackageView extends Omit<ExamPackageSummary, 'itemCount'> {
  items: ExamPackageItemView[]
  reviews: PackageReview[]
}

export interface ExamPackageCreatePayload {
  title: string
  subjectId: string
  gradeId: string
}

export interface AddQuestionPayload {
  type: QuestionType
  bodyHtml: string
  content: QuestionContent
  points: number
  authorEmployeeId?: string
}

export interface UpdateQuestionPayload {
  bodyHtml?: string
  content?: QuestionContent
  points?: number
}

export interface TakePayload {
  sourcePackageId: string
  questionIds: string[]
}

export interface ReturnPayload {
  note: string
  questionNotes: PackageQuestionNote[]
}

export interface ExamPackageQueryParams {
  page?: number
  limit?: number
  subjectId?: string
  gradeId?: string
  status?: ExamPackageStatus
  search?: string
}
