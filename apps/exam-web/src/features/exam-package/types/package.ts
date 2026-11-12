import type { components } from '@mts241alikhlash/exam-api'
import type { QuestionContent, QuestionType } from '@/features/exam-bank/types'

type Schemas = components['schemas']

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

export type AdjustKeyPayload = Schemas['AdjustPackageItemKeyDto']

export type AdjustedKey = Schemas['AdjustedPackageItemKeyDto']

export type ExamPackageSummary = Schemas['ExamPackageSummaryDto']

export type ExamPackageItemView = Schemas['ExamPackageItemViewDto']

export type PackageQuestionNote = Schemas['PackageQuestionNoteResponseDto']

export type PackageReview = Schemas['PackageReviewDto']

export type ExamPackageDetail = Schemas['ExamPackageDetailDto']

export type ExamPackageView = Schemas['ExamPackageViewDto']

export type ExamPackageCreatePayload = Schemas['CreateExamPackageDto']

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

export type TakePayload = Schemas['TakePackageQuestionsDto']

export type ReturnPayload = Schemas['ReturnExamPackageDto']

export interface ExamPackageQueryParams {
  page?: number
  limit?: number
  subjectId?: string
  gradeId?: string
  status?: ExamPackageStatus
  search?: string
}
