import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
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
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { AttachActivityPackageUseCase } from './attach-activity-package.use-case.js'

const CLASSROOM_7B = {
  id: '77777777-7777-4777-8777-777777777778',
  gradeId: CLASSROOM_7A.gradeId,
  academicYearId: YEAR_ID,
  name: 'VII B',
}

function seeded(
  overrides: Partial<ExamActivity> = {},
): FakeExamActivityRepository {
  const repo = new FakeExamActivityRepository()
  repo.activities.set('activity-1', {
    id: 'activity-1',
    semesterId: SEMESTER_ID,
    eventId: null,
    gradeId: CLASSROOM_7A.gradeId,
    subjectId: 'subject-inf',
    packageId: null,
    type: 'DAILY',
    tokenMode: 'ROTATING',
    tokenRotation: 0,
    presetId: 'preset-1',
    policy: { ...DEFAULT_POLICIES.DAILY },
    startsAt: new Date('2026-11-10T01:00:00Z'),
    endsAt: new Date('2026-11-10T04:00:00Z'),
    durationMinutes: 90,
    status: 'DRAFT',
    deliveryMode: 'ONLINE',
    offlineKind: null,
    maxScore: 100,
    autoStatus: true,
    createdById: 'admin-1',
    ...overrides,
  })
  return repo
}

function makeUseCase(
  repo: FakeExamActivityRepository,
  assignments: { subjectId: string; classroomId: string }[] = [],
) {
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
  return new AttachActivityPackageUseCase(repo, scope)
}

const input = {
  actor: SCHEDULE_ADMIN_USER,
  activityId: 'activity-1',
  packageId: 'package-1',
  classroomIds: [CLASSROOM_7A.id, CLASSROOM_7B.id],
}

describe('AttachActivityPackageUseCase', () => {
  it('attaches the package and creates one schedule per classroom', async () => {
    const repo = seeded()
    const updated = await makeUseCase(repo).execute(input)

    expect(updated.packageId).toBe('package-1')
    expect(repo.attachments).toEqual([
      {
        activityId: 'activity-1',
        packageId: 'package-1',
        classroomIds: [CLASSROOM_7A.id, CLASSROOM_7B.id],
      },
    ])
  })

  it('refuses a package that is not approved', async () => {
    const repo = seeded()
    repo.packageStatuses.set('package-1', 'SUBMITTED')

    await expect(makeUseCase(repo).execute(input)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    )
    expect(repo.attachments).toEqual([])
  })

  it('refuses a second attach', async () => {
    const repo = seeded({ packageId: 'package-0' })

    await expect(makeUseCase(repo).execute(input)).rejects.toMatchObject({
      response: { code: 'ACTIVITY_HAS_PACKAGE' },
    })
    expect(repo.attachments).toEqual([])
  })

  it('refuses an unknown activity', async () => {
    const repo = seeded()
    await expect(
      makeUseCase(repo).execute({
        ...input,
        activityId: 'activity-2',
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('refuses a missing package', async () => {
    const repo = seeded()
    repo.missingPackages.add('package-1')
    await expect(makeUseCase(repo).execute(input)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('refuses an attach without classrooms', async () => {
    const repo = seeded()
    await expect(
      makeUseCase(repo).execute({
        ...input,
        classroomIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(repo.attachments).toEqual([])
  })

  it('blocks Teacher A (7A) from attaching a package to classroom 7B', async () => {
    const repo = seeded({ createdById: 'teacher-a' })
    const teacherA: ScheduleAccessUser = {
      id: 'teacher-a',
      roles: ['TEACHER'],
      permissions: ['exam-schedules.manage'],
    }
    const useCase = makeUseCase(repo, [
      { subjectId: 'subject-inf', classroomId: CLASSROOM_7A.id },
    ])

    await expect(
      useCase.execute({
        actor: teacherA,
        activityId: 'activity-1',
        packageId: 'package-1',
        classroomIds: [CLASSROOM_7B.id],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(repo.attachments).toEqual([])
  })
})
