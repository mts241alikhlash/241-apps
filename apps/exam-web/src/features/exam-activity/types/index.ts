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

export type ActivityStatus = Schemas['ExamActivityDto']['status']

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  DRAFT: 'Draf',
  SCHEDULED: 'Terjadwal',
  ACTIVE: 'Berlangsung',
  CLOSED: 'Ditutup',
}

export const activityStatusLabel = (status: ActivityStatus): string =>
  ACTIVITY_STATUS_LABELS[status]

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

export interface ExamActivityRecord {
  id: string
  semesterId: string
  eventId?: string | null
  gradeId: string
  subjectId?: string
  packageId?: string
  type?: ExamType
  category?: ExamCategory
  status: ActivityStatus
  tokenMode: ActivityTokenMode
  tokenRotation: number
  durationMinutes: number
  startsAt: string
  endsAt: string
  policy: ExamPolicy | Record<string, number>
}

export type ExamActivitySchedule = Schemas['ExamActivityScheduleDto']

export interface ExamActivityDetail extends ExamActivityRecord {
  schedules: ExamActivitySchedule[]
}
