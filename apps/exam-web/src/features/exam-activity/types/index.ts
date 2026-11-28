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

export interface SubjectOption {
  id: string
  label: string
}

export interface EventOption {
  id: string
  name: string
  type: ExamType
}

export type ActivityCreatePayload = Schemas['CreateActivityRequestDto']

export type DeliveryMode = Schemas['ExamActivityDto']['deliveryMode']

export type OfflineKind = NonNullable<Schemas['ExamActivityDto']['offlineKind']>

export const DELIVERY_MODES = [
  'ONLINE',
  'OFFLINE',
] as const satisfies readonly DeliveryMode[]

export const OFFLINE_KINDS = [
  'WRITTEN',
  'PRACTICAL',
] as const satisfies readonly OfflineKind[]

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
}

export const OFFLINE_KIND_LABELS: Record<OfflineKind, string> = {
  WRITTEN: 'Written',
  PRACTICAL: 'Practical',
}

export const ACTIVITY_POLICY_DEFAULTS = {
  autoOpenLeadMinutes: 5,
  autoCloseGraceMinutes: 15,
  lateToleranceMinutes: 15,
} as const

export type AssignClassroomsPayload =
  Schemas['AssignActivityClassroomsRequestDto']

export type ActivityReadiness = Schemas['ActivityReadinessDto']

export interface ActivityReadinessQuery {
  eventId?: string
  date: string
}

export type ActivityPolicyPayload = Schemas['UpdateActivityPolicyRequestDto']

export type AttachPackagePayload = Schemas['AttachActivityPackageRequestDto']

export type ExamPolicy = Schemas['ExamPolicyDto']

export interface ExamActivityQuery {
  category?: ExamCategory
}

export type ExamActivityRecord = Schemas['ExamActivityDto']

export type ExamActivitySchedule = Schemas['ExamActivityScheduleDto']

export type ExamActivityDetail = Schemas['ExamActivityDetailDto']
