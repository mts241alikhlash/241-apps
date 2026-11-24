import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import {
  CLASSROOM_7A,
  FakeAcademicLookup,
  SCHEDULE_ADMIN_USER,
  YEAR_ID,
} from '../../../../exam-schedule/application/exam-schedule.test-support.js'
import {
  ScheduleScopeService,
  type ScheduleAccessUser,
} from '../../../../exam-schedule/application/schedule-scope.service.js'
import type { IEmployeeIdentityReadPort } from '../../../../platform/employee-identity/employee-identity.port.js'
import { FakeExamActivityRepository } from '../../exam-activity.repository.fake.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { ListActivitiesUseCase } from './list-activities.use-case.js'

const SEMESTER_ID = 'sem-1'
const OTHER_SEMESTER_ID = 'sem-2'
const CLASSROOM_7B = {
  id: '77777777-7777-4777-8777-777777777778',
  gradeId: CLASSROOM_7A.gradeId,
  academicYearId: YEAR_ID,
  name: 'VII B',
}

const employees = {
  findEmployeeIdByUserId: () => Promise.resolve('emp-1'),
  employeeExists: () => Promise.resolve(true),
} as IEmployeeIdentityReadPort

function makeUseCase(
  repo: FakeExamActivityRepository,
  academic = new FakeAcademicLookup({ semesterId: SEMESTER_ID }),
) {
  return new ListActivitiesUseCase(
    repo,
    academic,
    new ScheduleScopeService(employees, academic),
  )
}

function activity(
  id: string,
  semesterId: string,
  startsAt: string,
  type: ExamActivity['type'] = 'DAILY',
  createdById = 'admin-1',
): ExamActivity {
  return {
    id,
    semesterId,
    eventId: null,
    gradeId: CLASSROOM_7A.gradeId,
    subjectId: 'subject-inf',
    packageId: 'package-1',
    type,
    tokenMode: 'ROTATING',
    tokenRotation: 0,
    presetId: 'preset-1',
    policy: { ...DEFAULT_POLICIES[type] },
    startsAt: new Date(startsAt),
    endsAt: new Date('2026-11-10T04:00:00Z'),
    durationMinutes: 90,
    status: 'SCHEDULED',
    createdById,
  }
}

describe('ListActivitiesUseCase', () => {
  it('returns the activities of the active semester in start order', async () => {
    const repo = new FakeExamActivityRepository()
    repo.activities.set(
      'a-1',
      activity('a-1', SEMESTER_ID, '2026-11-10T03:00:00Z'),
    )
    repo.activities.set(
      'a-2',
      activity('a-2', OTHER_SEMESTER_ID, '2026-11-10T02:00:00Z'),
    )
    repo.activities.set(
      'a-3',
      activity('a-3', SEMESTER_ID, '2026-11-10T01:00:00Z'),
    )

    const activities = await makeUseCase(repo).execute(SCHEDULE_ADMIN_USER)

    expect(activities.map((row) => row.id)).toEqual(['a-3', 'a-1'])
  })

  it('filters activities by category when requested', async () => {
    const repo = new FakeExamActivityRepository()
    repo.activities.set(
      'a-daily',
      activity('a-daily', SEMESTER_ID, '2026-11-10T01:00:00Z', 'DAILY'),
    )
    repo.activities.set(
      'a-pts',
      activity('a-pts', SEMESTER_ID, '2026-11-10T02:00:00Z', 'MIDTERM'),
    )

    const exams = await makeUseCase(repo).execute(SCHEDULE_ADMIN_USER, 'EXAM')

    expect(exams.map((row) => row.id)).toEqual(['a-pts'])
  })

  it('names the subject and grade of every activity', async () => {
    const repo = new FakeExamActivityRepository()
    repo.activities.set(
      'a-1',
      activity('a-1', SEMESTER_ID, '2026-11-10T01:00:00Z'),
    )

    const rows = await makeUseCase(
      repo,
      new FakeAcademicLookup({
        semesterId: SEMESTER_ID,
        subjects: [{ id: 'subject-inf', name: 'Informatika' }],
      }),
    ).listNamed(SCHEDULE_ADMIN_USER)

    expect(rows.map((row) => [row.activity.id, row.subjectName])).toEqual([
      ['a-1', 'Informatika'],
    ])
    expect(rows[0].gradeName).toBeNull()
  })

  it('returns nothing when no semester is active', async () => {
    const repo = new FakeExamActivityRepository()
    repo.activities.set(
      'a-1',
      activity('a-1', SEMESTER_ID, '2026-11-10T01:00:00Z'),
    )

    const activities = await makeUseCase(
      repo,
      new FakeAcademicLookup({ semesterId: null }),
    ).execute(SCHEDULE_ADMIN_USER)

    expect(activities).toEqual([])
  })

  it('finds one activity with its classroom schedules and names', async () => {
    const repo = new FakeExamActivityRepository()
    const act = activity('a-1', SEMESTER_ID, '2026-11-10T01:00:00Z', 'MIDTERM')
    repo.activities.set(act.id, act)
    repo.activitySchedules.set(act.id, [
      {
        id: 'sched-1',
        classroomId: CLASSROOM_7A.id,
        startsAt: act.startsAt,
        endsAt: act.endsAt,
      },
    ])

    const useCase = makeUseCase(repo)
    const detail = await useCase.findOne('a-1', SCHEDULE_ADMIN_USER)

    expect(detail.activity.id).toBe('a-1')
    expect(detail.schedules).toEqual([
      {
        scheduleId: 'sched-1',
        classroomId: CLASSROOM_7A.id,
        classroomName: CLASSROOM_7A.name,
        startsAt: act.startsAt,
        endsAt: act.endsAt,
      },
    ])
    await expect(
      useCase.findOne('missing', SCHEDULE_ADMIN_USER),
    ).rejects.toThrow(NotFoundException)
  })

  it('isolates Teacher A (7A) from Teacher B (7B) on the same grade and subject', async () => {
    const repo = new FakeExamActivityRepository()
    const act7b = activity(
      'a-7b',
      SEMESTER_ID,
      '2026-11-10T01:00:00Z',
      'DAILY',
      'teacher-b',
    )
    const act7a = activity(
      'a-7a',
      SEMESTER_ID,
      '2026-11-10T02:00:00Z',
      'DAILY',
      'teacher-a',
    )
    repo.activities.set(act7b.id, act7b)
    repo.activities.set(act7a.id, act7a)
    repo.activitySchedules.set(act7b.id, [
      {
        id: 'sched-7b',
        classroomId: CLASSROOM_7B.id,
        startsAt: act7b.startsAt,
        endsAt: act7b.endsAt,
      },
    ])
    repo.activitySchedules.set(act7a.id, [
      {
        id: 'sched-7a',
        classroomId: CLASSROOM_7A.id,
        startsAt: act7a.startsAt,
        endsAt: act7a.endsAt,
      },
    ])

    const teacherA: ScheduleAccessUser = {
      id: 'teacher-a',
      roles: ['TEACHER'],
      permissions: ['exam-schedules.read', 'exam-schedules.manage'],
    }
    const useCase = makeUseCase(
      repo,
      new FakeAcademicLookup({
        semesterId: SEMESTER_ID,
        assignments: [
          { subjectId: 'subject-inf', classroomId: CLASSROOM_7A.id },
        ],
        classrooms: [CLASSROOM_7A, CLASSROOM_7B],
      }),
    )

    const listed = await useCase.listNamed(teacherA)
    expect(listed.map((row) => row.activity.id)).toEqual(['a-7a'])
    await expect(useCase.findOne('a-7b', teacherA)).rejects.toBeInstanceOf(
      ForbiddenException,
    )
    await expect(useCase.findOne('a-7a', teacherA)).resolves.toMatchObject({
      activity: { id: 'a-7a' },
    })
  })
})
