import type { ExamPolicy } from '../policies/exam-policy.policy.js'
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

export abstract class ExamActivityRepository {
  abstract findPreset(
    name: string,
  ): Promise<{ id: string; policy: unknown } | null>
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
  ): Promise<{ id: string; classroomId: string }[]>
  abstract listBySemester(semesterId: string): Promise<ExamActivity[]>
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
