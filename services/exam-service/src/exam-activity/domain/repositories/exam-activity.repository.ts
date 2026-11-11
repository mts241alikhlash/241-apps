import type {
  ExamCategory,
  ExamType,
} from '../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type { ExamPolicy } from '../policies/exam-policy.policy.js'
import type { ActivityEventRef } from '../policies/activity-rules.policy.js'
import type {
  ActivityStatus,
  ActivityTokenMode,
  ExamActivity,
  NewExamActivity,
} from '../entities/exam-activity.entity.js'

export interface ActivityAuditEntry {
  action: 'CREATE_ACTIVITY' | 'UPDATE_POLICY' | 'ROTATE_TOKEN' | 'UPDATE_STATUS'
  before: unknown
  after: unknown
}

export interface ActivityScheduleSummary {
  id: string
  classroomId: string
  startsAt: Date
  endsAt: Date
}

export interface PolicyPresetRecord {
  id: string
  type: ExamType
  policy: ExamPolicy
  updatedAt: Date
}

export abstract class ExamActivityRepository {
  abstract findPreset(
    name: string,
  ): Promise<{ id: string; policy: unknown } | null>
  abstract listPresets(): Promise<PolicyPresetRecord[]>
  abstract updatePreset(
    type: ExamType,
    policy: ExamPolicy,
  ): Promise<PolicyPresetRecord | null>
  abstract findEventRef(eventId: string): Promise<ActivityEventRef | null>
  abstract create(input: {
    activity: NewExamActivity
    classroomIds: string[]
    actorId: string
  }): Promise<ExamActivity>
  abstract findById(id: string): Promise<ExamActivity | null>
  abstract updatePolicy(
    id: string,
    policy: ExamPolicy,
    actorId: string,
  ): Promise<ExamActivity | null>
  abstract rotateToken(
    id: string,
    actorId: string,
  ): Promise<ExamActivity | null>
  abstract listSchedules(
    activityId: string,
  ): Promise<ActivityScheduleSummary[]>
  abstract listBySemester(
    semesterId: string,
    category?: ExamCategory,
  ): Promise<ExamActivity[]>
  abstract updateStatus(
    id: string,
    status: ActivityStatus,
    actorId: string,
  ): Promise<ExamActivity | null>
}

export interface ActivityScheduleCopy {
  classroomId: string
  tokenMode: ActivityTokenMode
}
