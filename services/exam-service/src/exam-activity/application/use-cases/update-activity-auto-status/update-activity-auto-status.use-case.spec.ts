import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
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
import { UpdateActivityAutoStatusUseCase } from './update-activity-auto-status.use-case.js'

const CLASSROOM_7B = {
  id: '77777777-7777-4777-8777-777777777778',
  gradeId: CLASSROOM_7A.gradeId,
  academicYearId: YEAR_ID,
  name: 'VII B',
}

function build() {
  const repo = new FakeExamActivityRepository()
  repo.activities.set('activity-1', {
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
    status: 'SCHEDULED',
    deliveryMode: 'ONLINE',
    offlineKind: null,
    maxScore: 100,
    autoStatus: true,
    createdById: 'admin-1',
  })
  const employees = {
    findEmployeeIdByUserId: () => Promise.resolve('emp-1'),
    employeeExists: () => Promise.resolve(true),
  } as IEmployeeIdentityReadPort
  const scope = new ScheduleScopeService(
    employees,
    new FakeAcademicLookup({
      semesterId: SEMESTER_ID,
      classrooms: [CLASSROOM_7A, CLASSROOM_7B],
    }),
  )
  return { repo, useCase: new UpdateActivityAutoStatusUseCase(repo, scope) }
}

describe('UpdateActivityAutoStatusUseCase', () => {
  it('switches the flag and writes one audit entry', async () => {
    const { repo, useCase } = build()

    const updated = await useCase.execute(
      SCHEDULE_ADMIN_USER,
      'activity-1',
      false,
    )

    expect(updated.autoStatus).toBe(false)
    expect(repo.activities.get('activity-1')?.autoStatus).toBe(false)
    expect(repo.autoStatusAudits).toEqual([
      {
        activityId: 'activity-1',
        actorId: SCHEDULE_ADMIN_USER.id,
        before: true,
        after: false,
      },
    ])
  })

  it('refuses an actor who may not manage the activity', async () => {
    const { repo, useCase } = build()
    const stranger: ScheduleAccessUser = {
      id: 'teacher-x',
      roles: ['TEACHER'],
      permissions: ['exam-schedules.read', 'exam-schedules.manage'],
    }

    await expect(
      useCase.execute(stranger, 'activity-1', false),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(repo.activities.get('activity-1')?.autoStatus).toBe(true)
    expect(repo.autoStatusAudits).toEqual([])
  })

  it('answers 404 for an unknown activity', async () => {
    const { useCase } = build()

    await expect(
      useCase.execute(SCHEDULE_ADMIN_USER, 'nope', false),
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})
