import type { components } from '@mts241alikhlash/exam-api'
import {
  EXAM_CATEGORIES,
  EXAM_TYPES,
  type ExamCategory,
  type ExamType,
} from '@/features/exam-shared/examType'

type Schemas = components['schemas']

export { EXAM_CATEGORIES, EXAM_TYPES }
export type { ExamCategory, ExamType }

export const SCHEDULE_STATUSES = ['SCHEDULED', 'CANCELLED'] as const

export type ExamScheduleStatus = Schemas['ExamScheduleDto']['status']

export const SCHEDULE_KINDS = ['REGULAR', 'MAKEUP'] as const

export type ExamScheduleKind = Schemas['ExamScheduleDto']['kind']

export type SchedulePhase = 'CANCELLED' | 'UPCOMING' | 'RUNNING' | 'ENDED'

export type ExamSchedule = Schemas['ExamScheduleDto']

export type SchedulePayload = Schemas['UpdateExamScheduleDto']

export type ScheduleCreatePayload = Schemas['CreateExamScheduleDto']

export interface ScheduleQueryParams {
  page?: number
  limit?: number
  classroomId?: string
  packageId?: string
  status?: ExamScheduleStatus
  category?: ExamCategory
  from?: string
  to?: string
}

export type AccessCode = Schemas['AccessCodeDto']

export const SESSION_STATUSES = [
  'IN_PROGRESS',
  'SUBMITTED',
  'EXPIRED',
  'GRADED',
] as const

export type ExamSessionStatus = (typeof SESSION_STATUSES)[number]

export type ScheduleSession = Schemas['ScheduleSessionDto']

export const MAKEUP_REASONS = ['SICK', 'PERMITTED', 'ABSENT', 'OTHER'] as const

export type MakeupReason = (typeof MAKEUP_REASONS)[number]

export type MakeupRefusal = 'ALREADY_SAT' | 'IN_PROGRESS' | 'ON_LIVE_MAKEUP'

export type Absentee = Schemas['AbsenteeDto']

export type MakeupParticipantInput = Schemas['MakeupParticipantDto']

export type MakeupCreatePayload = Schemas['CreateMakeupDto']

export type ParticipantStatus =
  'WAITING' | 'SAT_REGULAR' | 'IN_PROGRESS' | 'DONE'

export interface MakeupParticipant {
  studentId: string
  name: string | null
  nis: string | null
  reason: MakeupReason
  note: string | null
  status: ParticipantStatus
}

export interface MakeupOrigin {
  id: string
  packageId: string
  packageTitle: string
  classroomName: string | null
  durationMinutes: number
  endsAt: string
}

export type SessionAuditEntry = Schemas['AuditLogDto']
