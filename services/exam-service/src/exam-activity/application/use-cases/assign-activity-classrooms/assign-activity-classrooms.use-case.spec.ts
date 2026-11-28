import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
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
import { AttachActivityPackageUseCase } from '../attach-activity-package/attach-activity-package.use-case.js'
import { AssignActivityClassroomsUseCase } from './assign-activity-classrooms.use-case.js'

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

const CLASSROOM_8A = {
  id: '88888888-8888-4888-8888-888888888881',
  gradeId: '33333333-3333-4333-8333-333333333333',
  academicYearId: YEAR_ID,
  name: 'VIII A',
}

function make(
  repo: FakeExamActivityRepository,
  assignments: { subjectId: string; classroomId: string }[] = [],
) {
  const { scope: sc, academic } = scope(assignments)
  return new AssignActivityClassroomsUseCase(repo, sc, academic)
}

function scope(assignments: { subjectId: string; classroomId: string }[] = []) {
  const employees = {
    findEmployeeIdByUserId: () => Promise.resolve('emp-1'),
    employeeExists: () => Promise.resolve(true),
  } as IEmployeeIdentityReadPort
  const academic = new FakeAcademicLookup({
    semesterId: SEMESTER_ID,
    assignments,
    classrooms: [CLASSROOM_7A, CLASSROOM_7B, CLASSROOM_8A],
  })
  return { scope: new ScheduleScopeService(employees, academic), academic }
}

const input = {
  actor: SCHEDULE_ADMIN_USER,
  activityId: 'activity-1',
  classroomIds: [CLASSROOM_7A.id, CLASSROOM_7B.id],
}

describe('AssignActivityClassroomsUseCase', () => {
  it('creates one schedule per classroom from the activity', async () => {
    const repo = seeded({ deliveryMode: 'OFFLINE', offlineKind: 'WRITTEN' })
    const rows = await make(repo).execute(input)

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.classroomId)).toEqual(input.classroomIds)
    expect(rows[0]).toMatchObject({
      activityId: 'activity-1',
      deliveryMode: 'OFFLINE',
      packageId: null,
      semesterId: SEMESTER_ID,
      type: 'DAILY',
      durationMinutes: 90,
      startsAt: new Date('2026-11-10T01:00:00Z'),
      endsAt: new Date('2026-11-10T04:00:00Z'),
      createdById: 'admin-1',
    })
  })

  it('copies the activity package onto the new schedules', async () => {
    const repo = seeded({ packageId: 'package-1' })
    const rows = await make(repo).execute(input)

    expect(rows.every((row) => row.packageId === 'package-1')).toBe(true)
  })

  it('is idempotent and keeps the existing schedules', async () => {
    const repo = seeded()
    const useCase = make(repo)
    const first = await useCase.execute({
      ...input,
      classroomIds: [CLASSROOM_7A.id],
    })
    const second = await useCase.execute(input)

    expect(repo.scheduleRecords).toHaveLength(2)
    expect(second[0]?.id).toBe(first[0]?.id)
    expect(await useCase.execute(input)).toHaveLength(2)
    expect(repo.scheduleRecords).toHaveLength(2)
  })

  it('dedupes duplicate classroom ids', async () => {
    const repo = seeded()
    const rows = await make(repo).execute({
      ...input,
      classroomIds: [CLASSROOM_7A.id, CLASSROOM_7A.id],
    })

    expect(rows).toHaveLength(1)
    expect(repo.scheduleRecords).toHaveLength(1)
  })

  it('refuses an unknown classroom or one of another grade', async () => {
    const repo = seeded()
    for (const classroomIds of [
      ['99999999-9999-4999-8999-999999999999'],
      [CLASSROOM_7A.id, CLASSROOM_8A.id],
    ]) {
      await expect(
        make(repo).execute({ ...input, classroomIds }),
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: 'Kelas tidak ditemukan atau bukan tingkat kegiatan ini',
      })
    }
    expect(repo.scheduleRecords).toEqual([])
  })

  it('rejects an empty classroom list', async () => {
    const repo = seeded()
    await expect(
      make(repo).execute({
        ...input,
        classroomIds: [],
      }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      message: 'Pilih minimal satu kelas',
    })
  })

  it('refuses an unknown activity', async () => {
    await expect(
      make(seeded()).execute({
        ...input,
        activityId: 'activity-2',
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('blocks Teacher A (7A) from assigning classroom 7B', async () => {
    const repo = seeded({ createdById: 'teacher-a' })
    const teacherA: ScheduleAccessUser = {
      id: 'teacher-a',
      roles: ['TEACHER'],
      permissions: ['exam-schedules.manage'],
    }
    await expect(
      make(repo, [
        { subjectId: 'subject-inf', classroomId: CLASSROOM_7A.id },
      ]).execute({
        actor: teacherA,
        activityId: 'activity-1',
        classroomIds: [CLASSROOM_7B.id],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(repo.scheduleRecords).toEqual([])
  })

  it('lets a package attached later update both schedules without duplicates', async () => {
    const repo = seeded()
    const { scope: sc, academic } = scope()
    await new AssignActivityClassroomsUseCase(repo, sc, academic).execute(input)
    await new AttachActivityPackageUseCase(repo, sc, academic).execute({
      actor: SCHEDULE_ADMIN_USER,
      activityId: 'activity-1',
      packageId: 'package-1',
      classroomIds: [CLASSROOM_7A.id, CLASSROOM_7B.id],
    })

    expect(repo.scheduleRecords).toHaveLength(2)
    expect(repo.scheduleRecords.map((row) => row.packageId)).toEqual([
      'package-1',
      'package-1',
    ])
  })
})
