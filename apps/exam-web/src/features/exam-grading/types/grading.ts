import type { components } from '@mts241alikhlash/exam-api'
import type {
  ExamCategory,
  ExamSessionStatus,
} from '@/features/exam-schedule/types'

type Schemas = components['schemas']

export type GradingSchedule = Schemas['GradingScheduleDto']

export type GradingSessionRow = Schemas['GradingSessionRowDto']

export type PublicationState = GradingSessionRow['publication']

export type GradingItem = Schemas['GradingItemDto']

export type GradingDetail = Schemas['GradingSessionDetailDto']

export type GradePayload = Schemas['GradeAnswerDto']

export interface GradingScheduleQuery {
  page?: number
  limit?: number
  semesterId?: string
  category?: ExamCategory
}

export interface GradingSessionQuery {
  page?: number
  limit?: number
  status?: ExamSessionStatus
}
