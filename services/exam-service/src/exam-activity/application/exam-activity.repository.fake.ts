import { randomUUID } from 'node:crypto'
import type { ExamPolicy } from '../domain/policies/exam-policy.policy.js'
import type {
  ActivityStatus,
  ExamActivity,
  NewExamActivity,
} from '../domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../domain/repositories/exam-activity.repository.js'

export class FakeExamActivityRepository extends ExamActivityRepository {
  readonly activities = new Map<string, ExamActivity>()

  findPreset() {
    return Promise.resolve(null)
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

  listSchedules() {
    return Promise.resolve([])
  }

  listBySemester(semesterId: string) {
    return Promise.resolve(
      [...this.activities.values()]
        .filter((activity) => activity.semesterId === semesterId)
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    )
  }

  updateStatus(id: string, status: ActivityStatus) {
    const activity = this.activities.get(id)
    if (activity === undefined) return Promise.resolve(null)
    const updated: ExamActivity = { ...activity, status }
    this.activities.set(id, updated)
    return Promise.resolve(updated)
  }
}
