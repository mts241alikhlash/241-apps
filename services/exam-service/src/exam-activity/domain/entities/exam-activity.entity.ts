import type { ExamType } from '../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type { ExamPolicy } from '../policies/exam-policy.policy.js'

export const ACTIVITY_TOKEN_MODES = ['ROTATING', 'STATIC'] as const
export type ActivityTokenMode = (typeof ACTIVITY_TOKEN_MODES)[number]

export const ACTIVITY_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'CLOSED',
] as const
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]

export const EXAM_DELIVERY_MODES = ['ONLINE', 'OFFLINE'] as const
export type ExamDeliveryMode = (typeof EXAM_DELIVERY_MODES)[number]

export const EXAM_OFFLINE_KINDS = ['WRITTEN', 'PRACTICAL'] as const
export type ExamOfflineKind = (typeof EXAM_OFFLINE_KINDS)[number]

export interface ExamActivity {
  id: string
  semesterId: string
  eventId: string | null
  gradeId: string
  subjectId: string
  packageId: string | null
  type: ExamType
  tokenMode: ActivityTokenMode
  tokenRotation: number
  presetId: string | null
  policy: ExamPolicy
  startsAt: Date
  endsAt: Date
  durationMinutes: number
  status: ActivityStatus
  deliveryMode: ExamDeliveryMode
  offlineKind: ExamOfflineKind | null
  maxScore: number
  autoStatus: boolean
  createdById: string
}

export interface NewExamActivity {
  semesterId: string
  eventId: string | null
  gradeId: string
  subjectId: string
  packageId: string | null
  type: ExamType
  tokenMode: ActivityTokenMode
  presetId: string | null
  policy: ExamPolicy
  startsAt: Date
  endsAt: Date
  durationMinutes: number
  deliveryMode?: ExamDeliveryMode
  offlineKind?: ExamOfflineKind | null
  maxScore?: number
  autoStatus?: boolean
  createdById: string
}
