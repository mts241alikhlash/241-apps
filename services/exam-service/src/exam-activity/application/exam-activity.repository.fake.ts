import { randomUUID } from 'node:crypto'
import {
  EXAM_TYPES,
  type ExamCategory,
  type ExamType,
} from '../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { categoryOf } from '../../exam-schedule/domain/policies/exam-category.policy.js'
import {
  DEFAULT_POLICIES,
  type ExamPolicy,
} from '../domain/policies/exam-policy.policy.js'
import type { ActivityEventRef } from '../domain/policies/activity-rules.policy.js'
import type {
  ActivityStatus,
  ExamActivity,
  NewExamActivity,
} from '../domain/entities/exam-activity.entity.js'
import {
  type ActivityScheduleSummary,
  ExamActivityRepository,
  type PolicyPresetRecord,
} from '../domain/repositories/exam-activity.repository.js'

export class FakeExamActivityRepository extends ExamActivityRepository {
  readonly activities = new Map<string, ExamActivity>()
  readonly events = new Map<string, ActivityEventRef>()
  readonly activitySchedules = new Map<string, ActivityScheduleSummary[]>()
  readonly presets = new Map<ExamType, PolicyPresetRecord>(
    EXAM_TYPES.map((type) => [
      type,
      {
        id: `preset-${type}`,
        type,
        policy: { ...DEFAULT_POLICIES[type] },
        updatedAt: new Date('2026-11-10T00:00:00.000Z'),
      },
    ]),
  )

  readonly packageStatuses = new Map<string, string>()

  findPackageStatus(packageId: string) {
    return Promise.resolve(this.packageStatuses.get(packageId) ?? 'APPROVED')
  }

  findPreset(name: string) {
    const preset = this.presets.get(name as ExamType)
    return Promise.resolve(
      preset ? { id: preset.id, policy: { ...preset.policy } } : null,
    )
  }

  listPresets() {
    return Promise.resolve(
      EXAM_TYPES.flatMap((type) => {
        const preset = this.presets.get(type)
        return preset ? [{ ...preset, policy: { ...preset.policy } }] : []
      }),
    )
  }

  updatePreset(type: ExamType, policy: ExamPolicy) {
    const preset = this.presets.get(type)
    if (!preset) return Promise.resolve(null)
    const updated: PolicyPresetRecord = {
      ...preset,
      policy: { ...policy },
      updatedAt: new Date(),
    }
    this.presets.set(type, updated)
    return Promise.resolve(updated)
  }

  findEventRef(eventId: string) {
    return Promise.resolve(this.events.get(eventId) ?? null)
  }

  create(input: {
    activity: NewExamActivity
    classroomIds: string[]
    actorId: string
  }) {
    const activity: ExamActivity = {
      ...input.activity,
      id: randomUUID(),
      tokenRotation: 0,
      status: 'DRAFT',
    }
    this.activities.set(activity.id, activity)
    this.activitySchedules.set(
      activity.id,
      input.classroomIds.map((classroomId) => ({
        id: randomUUID(),
        classroomId,
        startsAt: activity.startsAt,
        endsAt: activity.endsAt,
      })),
    )
    return Promise.resolve(activity)
  }

  findById(id: string) {
    return Promise.resolve(this.activities.get(id) ?? null)
  }

  updatePolicy(id: string, policy: ExamPolicy) {
    const activity = this.activities.get(id)
    if (activity === undefined) return Promise.resolve(null)
    const updated: ExamActivity = { ...activity, policy }
    this.activities.set(id, updated)
    return Promise.resolve(updated)
  }

  rotateToken(id: string) {
    const activity = this.activities.get(id)
    if (activity === undefined) return Promise.resolve(null)
    const updated: ExamActivity = {
      ...activity,
      tokenRotation: activity.tokenRotation + 1,
    }
    this.activities.set(id, updated)
    return Promise.resolve(updated)
  }

  listSchedules(activityId: string) {
    return Promise.resolve(this.activitySchedules.get(activityId) ?? [])
  }

  listBySemester(semesterId: string, category?: ExamCategory) {
    return Promise.resolve(
      [...this.activities.values()]
        .filter((activity) => activity.semesterId === semesterId)
        .filter(
          (activity) =>
            category === undefined || categoryOf(activity.type) === category,
        )
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    )
  }

  updateStatus(id: string, status: ActivityStatus, _actorId: string) {
    const activity = this.activities.get(id)
    if (activity === undefined) return Promise.resolve(null)
    const updated: ExamActivity = { ...activity, status }
    this.activities.set(id, updated)
    return Promise.resolve(updated)
  }
}
