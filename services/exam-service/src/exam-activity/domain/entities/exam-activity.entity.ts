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

export interface ExamActivity {
  id: string
  semesterId: string
  eventId: string | null
  gradeId: string
  subjectId: string
  packageId: string
  type: ExamType
  tokenMode: ActivityTokenMode
  tokenRotation: number
  presetId: string | null
  policy: ExamPolicy
  startsAt: Date
  endsAt: Date
  durationMinutes: number
  status: ActivityStatus
  createdById: string
}

export interface NewExamActivity {
  semesterId: string
  eventId: string | null
  gradeId: string
  subjectId: string
  packageId: string
  type: ExamType
  tokenMode: ActivityTokenMode
  presetId: string | null
  policy: ExamPolicy
  startsAt: Date
  endsAt: Date
  durationMinutes: number
  createdById: string
}
