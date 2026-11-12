import type { components } from '@mts241alikhlash/exam-api'
import type { ExamCategory, ExamType } from '@/features/exam-shared/examType'

type Schemas = components['schemas']

export type { ExamCategory, ExamType }

export type PresetName = ExamType

export const ACTIVITY_TOKEN_MODES = ['ROTATING', 'STATIC'] as const

export type ActivityTokenMode = Schemas['CreateActivityRequestDto']['tokenMode']

export const ACTIVITY_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'CLOSED',
] as const

export type ActivityStatus = Schemas['UpdateActivityStatusRequestDto']['status']

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  DRAFT: 'Draf',
  SCHEDULED: 'Terjadwal',
  ACTIVE: 'Berlangsung',
  CLOSED: 'Ditutup',
}

export const activityStatusLabel = (status: string): string =>
  (ACTIVITY_STATUS_LABELS as Record<string, string>)[status] ?? status

export interface GradeOption {
  id: string
  label: string
}

export interface ClassroomOption {
  id: string
  gradeId: string
  label: string
}

export interface PackageOption {
  id: string
  subjectId: string
  label: string
}

export interface EventOption {
  id: string
  name: string
  type: ExamType
}

export type ActivityCreatePayload = Schemas['CreateActivityRequestDto']

export type ActivityPolicyPayload = Schemas['UpdateActivityPolicyRequestDto']

export type ExamPolicy = Schemas['ExamPolicyDto']

export interface ExamActivityQuery {
  category?: ExamCategory
}

export type ExamActivityRecord = Schemas['ExamActivityDto']

export type ExamActivitySchedule = Schemas['ExamActivityScheduleDto']

export type ExamActivityDetail = Schemas['ExamActivityDetailDto']
