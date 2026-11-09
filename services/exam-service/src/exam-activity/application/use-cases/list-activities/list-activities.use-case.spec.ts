import { describe, expect, it } from 'vitest'
import { FakeAcademicLookup } from '../../../../exam-schedule/application/exam-schedule.test-support.js'
import { FakeExamActivityRepository } from '../../exam-activity.repository.fake.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { ListActivitiesUseCase } from './list-activities.use-case.js'

const SEMESTER_ID = 'sem-1'
const OTHER_SEMESTER_ID = 'sem-2'

function activity(id: string, semesterId: string): ExamActivity {
  return {
    id,
    semesterId,
    eventId: null,
    gradeId: 'grade-9',
    subjectId: 'subject-inf',
    packageId: 'package-1',
    type: 'UH',
    tokenMode: 'ROTATING',
    tokenRotation: 0,
    presetId: 'preset-1',
    policy: { ...DEFAULT_POLICIES.UJIAN_KETAT },
    startsAt: new Date('2026-11-10T01:00:00Z'),
    endsAt: new Date('2026-11-10T04:00:00Z'),
    durationMinutes: 90,
    status: 'SCHEDULED',
    createdById: 'admin-1',
  }
}

describe('ListActivitiesUseCase', () => {
  it('returns the activities of the active semester only', async () => {
    const repo = new FakeExamActivityRepository()
    repo.activities.set('a-1', activity('a-1', SEMESTER_ID))
    repo.activities.set('a-2', activity('a-2', OTHER_SEMESTER_ID))
    repo.activities.set('a-3', activity('a-3', SEMESTER_ID))

    const activities = await new ListActivitiesUseCase(
      repo,
      new FakeAcademicLookup({ semesterId: SEMESTER_ID }),
    ).execute()

    expect(activities.map((row) => row.id)).toEqual(['a-1', 'a-3'])
  })

  it('returns nothing when no semester is active', async () => {
    const repo = new FakeExamActivityRepository()
    repo.activities.set('a-1', activity('a-1', SEMESTER_ID))

    const activities = await new ListActivitiesUseCase(
      repo,
      new FakeAcademicLookup({ semesterId: null }),
    ).execute()

    expect(activities).toEqual([])
  })
})
