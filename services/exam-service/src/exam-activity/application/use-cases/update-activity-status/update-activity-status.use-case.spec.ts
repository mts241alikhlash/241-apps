import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import {
  CLASSROOM_7A,
  FakeAcademicLookup,
  SCHEDULE_ADMIN_USER,
  SEMESTER_ID,
  YEAR_ID,
} from '../../../../exam-schedule/application/exam-schedule.test-support.js'
import {
  ScheduleScopeService,
  type ScheduleAccessUser,
} from '../../../../exam-schedule/application/schedule-scope.service.js'
import type { IEmployeeIdentityReadPort } from '../../../../platform/employee-identity/employee-identity.port.js'
import { FakeExamActivityRepository } from '../../exam-activity.repository.fake.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'
import type {
  ActivityStatus,
  ExamActivity,
} from '../../../domain/entities/exam-activity.entity.js'
import type { CloseActivitySessionsUseCase } from '../../../../exam-session/application/use-cases/close-activity-sessions/close-activity-sessions.use-case.js'
import { UpdateActivityStatusUseCase } from './update-activity-status.use-case.js'

const CLASSROOM_7B = {
  id: '77777777-7777-4777-8777-777777777778',
  gradeId: CLASSROOM_7A.gradeId,
  academicYearId: YEAR_ID,
  name: 'VII B',
}

function seeded(status: ActivityStatus): FakeExamActivityRepository {
  const repo = new FakeExamActivityRepository()
  const activity: ExamActivity = {
    id: 'activity-1',
    semesterId: SEMESTER_ID,
    eventId: null,
    gradeId: CLASSROOM_7A.gradeId,
    subjectId: 'subject-inf',
    packageId: 'package-1',
    type: 'DAILY',
    tokenMode: 'ROTATING',
    tokenRotation: 0,
    presetId: 'preset-1',
    policy: { ...DEFAULT_POLICIES.DAILY },
    startsAt: new Date('2026-11-10T01:00:00Z'),
    endsAt: new Date('2026-11-10T04:00:00Z'),
    durationMinutes: 90,
    status,
    deliveryMode: 'ONLINE',
    offlineKind: null,
    maxScore: 100,
    autoStatus: true,
    createdById: 'admin-1',
  }
  repo.activities.set(activity.id, activity)
  return repo
}

function build(
  repo: FakeExamActivityRepository,
  assignments: { subjectId: string; classroomId: string }[] = [],
) {
  const closeSessions = { execute: vi.fn().mockResolvedValue(0) }
  const employees = {
    findEmployeeIdByUserId: () => Promise.resolve('emp-1'),
    employeeExists: () => Promise.resolve(true),
  } as IEmployeeIdentityReadPort
  const scope = new ScheduleScopeService(
    employees,
    new FakeAcademicLookup({
      semesterId: SEMESTER_ID,
      assignments,
      classrooms: [CLASSROOM_7A, CLASSROOM_7B],
    }),
  )
  return {
    useCase: new UpdateActivityStatusUseCase(
      repo,
      closeSessions as unknown as CloseActivitySessionsUseCase,
      scope,
    ),
    closeSessions,
  }
}

describe('UpdateActivityStatusUseCase', () => {
  it('stores the new status and closes the running sessions once', async () => {
    const repo = seeded('ACTIVE')
    const { useCase, closeSessions } = build(repo)

    const updated = await useCase.execute(
      SCHEDULE_ADMIN_USER,
      'activity-1',
      'CLOSED',
    )

    expect(updated.status).toBe('CLOSED')
    expect(repo.activities.get('activity-1')?.status).toBe('CLOSED')
    expect(closeSessions.execute).toHaveBeenCalledExactlyOnceWith(
      'activity-1',
      SCHEDULE_ADMIN_USER.id,
    )
  })

  it('keeps the activity ACTIVE when closing the sessions fails', async () => {
    const repo = seeded('ACTIVE')
    const { useCase, closeSessions } = build(repo)
    closeSessions.execute.mockRejectedValueOnce(new Error('finalizer down'))

    await expect(
      useCase.execute(SCHEDULE_ADMIN_USER, 'activity-1', 'CLOSED'),
    ).rejects.toThrow('finalizer down')
    expect(repo.activities.get('activity-1')?.status).toBe('ACTIVE')
  })

  it('leaves the sessions alone when the activity never ran', async () => {
    const repo = seeded('SCHEDULED')
    const { useCase, closeSessions } = build(repo)

    await useCase.execute(SCHEDULE_ADMIN_USER, 'activity-1', 'CLOSED')

    expect(closeSessions.execute).not.toHaveBeenCalled()
  })

  it('refuses to activate an activity without a package', async () => {
    const repo = seeded('DRAFT')
    repo.activities.set('activity-1', {
      ...repo.activities.get('activity-1')!,
      packageId: null,
    })
    const { useCase, closeSessions } = build(repo)

    await expect(
      useCase.execute(SCHEDULE_ADMIN_USER, 'activity-1', 'SCHEDULED'),
    ).rejects.toMatchObject({
      message: 'Pasang paket soal dulu',
    })
    expect(repo.activities.get('activity-1')?.status).toBe('DRAFT')
    expect(closeSessions.execute).not.toHaveBeenCalled()
  })

  it('refuses an unknown activity', async () => {
    const repo = seeded('SCHEDULED')
    const { useCase, closeSessions } = build(repo)

    await expect(
      useCase.execute(SCHEDULE_ADMIN_USER, 'activity-2', 'CLOSED'),
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(closeSessions.execute).not.toHaveBeenCalled()
  })

  it('blocks Teacher A (7A) from closing Teacher B (7B) activity in the same grade and subject', async () => {
    const repo = seeded('ACTIVE')
    const act = repo.activities.get('activity-1')!
    repo.activities.set(act.id, { ...act, createdById: 'teacher-b' })
    repo.activitySchedules.set(act.id, [
      {
        id: 'sched-7b',
        classroomId: CLASSROOM_7B.id,
        startsAt: act.startsAt,
        endsAt: act.endsAt,
      },
    ])
    const { useCase, closeSessions } = build(repo, [
      { subjectId: 'subject-inf', classroomId: CLASSROOM_7A.id },
    ])
    const teacherA: ScheduleAccessUser = {
      id: 'teacher-a',
      roles: ['TEACHER'],
      permissions: ['exam-schedules.manage'],
    }

    await expect(
      useCase.execute(teacherA, 'activity-1', 'CLOSED'),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(repo.activities.get('activity-1')?.status).toBe('ACTIVE')
    expect(closeSessions.execute).not.toHaveBeenCalled()
  })
})
