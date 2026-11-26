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
import type { ExamSchedule } from '../../exam-schedule/domain/entities/exam-schedule.entity.js'
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

  readonly scheduleRecords: ExamSchedule[] = []

  private addSchedule(
    activity: ExamActivity,
    classroomId: string,
  ): ExamSchedule {
    const record: ExamSchedule = {
      id: randomUUID(),
      deliveryMode: activity.deliveryMode,
      packageId: activity.packageId,
      packageTitle: null,
      subjectId: activity.subjectId,
      classroomId,
      semesterId: activity.semesterId,
      eventId: activity.eventId,
      startsAt: activity.startsAt,
      endsAt: activity.endsAt,
      durationMinutes: activity.durationMinutes,
      type: activity.type,
      kind: 'REGULAR',
      makeupOfId: null,
      tokenRotation: 0,
      activityId: activity.id,
      minSubmitMinutes: 0,
      status: 'SCHEDULED',
      createdById: activity.createdById,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.scheduleRecords.push(record)
    this.activitySchedules.set(activity.id, [
      ...(this.activitySchedules.get(activity.id) ?? []),
      {
        id: record.id,
        classroomId,
        startsAt: activity.startsAt,
        endsAt: activity.endsAt,
      },
    ])
    return record
  }

  assignClassrooms(input: {
    activityId: string
    classroomIds: string[]
    actorId: string
  }) {
    const activity = this.activities.get(input.activityId)
    if (activity === undefined) return Promise.resolve(null)
    const have = new Set(
      this.scheduleRecords
        .filter((row) => row.activityId === input.activityId)
        .map((row) => row.classroomId),
    )
    for (const classroomId of new Set(input.classroomIds)) {
      if (!have.has(classroomId)) this.addSchedule(activity, classroomId)
    }
    return Promise.resolve(
      this.scheduleRecords.filter(
        (row) =>
          row.activityId === input.activityId &&
          input.classroomIds.includes(row.classroomId),
      ),
    )
  }

  readonly packageStatuses = new Map<string, string>()
  readonly missingPackages = new Set<string>()

  findPackageStatus(packageId: string): Promise<string | null> {
    if (this.missingPackages.has(packageId)) return Promise.resolve(null)
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
      deliveryMode: input.activity.deliveryMode ?? 'ONLINE',
      offlineKind: input.activity.offlineKind ?? null,
      maxScore: input.activity.maxScore ?? 100,
      autoStatus: input.activity.autoStatus ?? true,
    }
    this.activities.set(activity.id, activity)
    this.activitySchedules.set(activity.id, [])
    if (activity.packageId !== null) {
      for (const classroomId of input.classroomIds) {
        this.addSchedule(activity, classroomId)
      }
    }
    return Promise.resolve(activity)
  }

  readonly attachments: {
    activityId: string
    packageId: string
    classroomIds: string[]
  }[] = []

  attachPackage(input: {
    activityId: string
    packageId: string
    classroomIds: string[]
    actorId: string
  }) {
    const activity = this.activities.get(input.activityId)
    if (activity === undefined) return Promise.resolve(null)
    this.attachments.push({
      activityId: input.activityId,
      packageId: input.packageId,
      classroomIds: input.classroomIds,
    })
    const updated: ExamActivity = { ...activity, packageId: input.packageId }
    this.activities.set(input.activityId, updated)
    for (const row of this.scheduleRecords) {
      if (row.activityId === input.activityId && row.packageId === null) {
        row.packageId = input.packageId
      }
    }
    const have = new Set(
      this.scheduleRecords
        .filter((row) => row.activityId === input.activityId)
        .map((row) => row.classroomId),
    )
    for (const classroomId of new Set(input.classroomIds)) {
      if (!have.has(classroomId)) this.addSchedule(updated, classroomId)
    }
    return Promise.resolve(updated)
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

  readonly autoAudits: {
    activityId: string
    actorId: string
    before: ActivityStatus
    after: ActivityStatus
    reason: string
  }[] = []

  findDueForAdvance(now: Date) {
    return Promise.resolve(
      [...this.activities.values()].filter(
        (activity) =>
          activity.autoStatus &&
          ((activity.status === 'SCHEDULED' &&
            activity.startsAt.getTime() <= now.getTime() + 60 * 60_000) ||
            (activity.status === 'ACTIVE' &&
              activity.endsAt.getTime() <= now.getTime())),
      ),
    )
  }

  updateStatusIf(
    id: string,
    expected: ActivityStatus,
    next: ActivityStatus,
    actorId: string,
    reason: string,
  ) {
    const activity = this.activities.get(id)
    if (activity?.status !== expected) {
      return Promise.resolve(false)
    }
    this.activities.set(id, { ...activity, status: next })
    this.autoAudits.push({
      activityId: id,
      actorId,
      before: expected,
      after: next,
      reason,
    })
    return Promise.resolve(true)
  }
}
