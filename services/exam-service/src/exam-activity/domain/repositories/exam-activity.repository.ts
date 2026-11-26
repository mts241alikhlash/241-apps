import type {
  ExamCategory,
  ExamType,
} from '../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type { ExamSchedule } from '../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type { ExamPolicy } from '../policies/exam-policy.policy.js'
import type { ActivityEventRef } from '../policies/activity-rules.policy.js'
import type {
  ActivityStatus,
  ActivityTokenMode,
  ExamActivity,
  NewExamActivity,
} from '../entities/exam-activity.entity.js'

export type AutoStatusReason = 'AUTO_OPEN' | 'AUTO_CLOSE'

export interface ActivityAuditEntry {
  action:
    | 'CREATE_ACTIVITY'
    | 'ATTACH_PACKAGE'
    | 'UPDATE_POLICY'
    | 'ROTATE_TOKEN'
    | 'UPDATE_STATUS'
    | 'AUTO_STATUS'
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
  abstract findPackageStatus(packageId: string): Promise<string | null>
  abstract create(input: {
    activity: NewExamActivity
    classroomIds: string[]
    actorId: string
  }): Promise<ExamActivity>
  abstract attachPackage(input: {
    activityId: string
    packageId: string
    classroomIds: string[]
    actorId: string
  }): Promise<ExamActivity | null>
  abstract assignClassrooms(input: {
    activityId: string
    classroomIds: string[]
    actorId: string
  }): Promise<ExamSchedule[] | null>
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
  abstract listSchedules(activityId: string): Promise<ActivityScheduleSummary[]>
  abstract listBySemester(
    semesterId: string,
    category?: ExamCategory,
  ): Promise<ExamActivity[]>
  abstract updateStatus(
    id: string,
    status: ActivityStatus,
    actorId: string,
  ): Promise<ExamActivity | null>
  abstract findDueForAdvance(now: Date): Promise<ExamActivity[]>
  abstract updateStatusIf(
    id: string,
    expected: ActivityStatus,
    next: ActivityStatus,
    actorId: string,
    reason: AutoStatusReason,
  ): Promise<boolean>
}

export interface ActivityScheduleCopy {
  classroomId: string
  tokenMode: ActivityTokenMode
}
