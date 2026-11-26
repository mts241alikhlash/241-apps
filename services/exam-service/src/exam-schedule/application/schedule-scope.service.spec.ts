import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { ExamActivity } from '../../exam-activity/domain/entities/exam-activity.entity.js'
import { DEFAULT_POLICIES } from '../../exam-activity/domain/policies/exam-policy.policy.js'
import type { IEmployeeIdentityReadPort } from '../../platform/employee-identity/employee-identity.port.js'
import type { ExamSchedule } from '../domain/entities/exam-schedule.entity.js'
import {
  CLASSROOM_7A,
  FakeAcademicLookup,
  SEMESTER_ID,
  YEAR_ID,
} from './exam-schedule.test-support.js'
import {
  ScheduleScopeService,
  type ScheduleAccessUser,
} from './schedule-scope.service.js'

const CLASSROOM_7B = {
  id: '77777777-7777-4777-8777-777777777778',
  gradeId: CLASSROOM_7A.gradeId,
  academicYearId: YEAR_ID,
  name: 'VII B',
}

const CLASSROOM_8A = {
  id: '88888888-8888-4888-8888-888888888881',
  gradeId: '33333333-3333-4333-8333-333333333333',
  academicYearId: YEAR_ID,
  name: 'VIII A',
}

const employees = (employeeId: string | null) =>
  ({
    findEmployeeIdByUserId: () => Promise.resolve(employeeId),
    employeeExists: () => Promise.resolve(true),
  }) as IEmployeeIdentityReadPort

const teacher: ScheduleAccessUser = {
  id: 'teacher-1',
  roles: ['TEACHER'],
  permissions: ['exam-schedules.read', 'exam-schedules.manage'],
}

const principal: ScheduleAccessUser = {
  id: 'principal-1',
  roles: ['PRINCIPAL'],
  permissions: ['exam-schedules.read', 'exam-events.read'],
}

const curriculumStaff: ScheduleAccessUser = {
  id: 'staff-1',
  roles: ['CURRICULUM_STAFF'],
  permissions: [
    'exam-schedules.read',
    'exam-schedules.manage',
    'exam-events.read',
    'exam-events.manage',
  ],
}

const examAdmin: ScheduleAccessUser = {
  id: 'admin-1',
  roles: ['EXAM_ADMIN'],
  permissions: ['exam-schedules.manage-all', 'exam-events.manage'],
}

function activity(overrides: Partial<ExamActivity> = {}): ExamActivity {
  return {
    id: 'act-1',
    semesterId: SEMESTER_ID,
    eventId: null,
    gradeId: CLASSROOM_7A.gradeId,
    subjectId: 'math',
    packageId: 'pkg-1',
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
    createdById: 'other-user',
    ...overrides,
  }
}

function schedule(overrides: Partial<ExamSchedule> = {}): ExamSchedule {
  return {
    id: 'sched-1',
    deliveryMode: 'ONLINE',
    packageId: 'pkg-1',
    packageTitle: 'Paket',
    subjectId: 'math',
    classroomId: CLASSROOM_7A.id,
    semesterId: SEMESTER_ID,
    eventId: null,
    startsAt: new Date('2026-11-10T01:00:00Z'),
    endsAt: new Date('2026-11-10T04:00:00Z'),
    durationMinutes: 90,
    type: 'DAILY',
    kind: 'REGULAR',
    makeupOfId: null,
    tokenRotation: 0,
    minSubmitMinutes: 0,
    status: 'SCHEDULED',
    createdById: 'other-user',
    createdAt: new Date('2026-11-01T00:00:00Z'),
    updatedAt: new Date('2026-11-01T00:00:00Z'),
    ...overrides,
  }
}

describe('ScheduleScopeService', () => {
  it('grants full read and manage to exam-schedules.manage-all without academic lookups', async () => {
    const academic = new FakeAcademicLookup()
    const spy = vi.spyOn(academic, 'teachingAssignmentsOf')
    const scope = await new ScheduleScopeService(
      employees(null),
      academic,
    ).forUser(examAdmin)

    expect(scope.allRead).toBe(true)
    expect(scope.allManage).toBe(true)
    expect(scope.nonExamOnly).toBe(false)

    await expect(
      scope.assertCanManageActivity(activity({ type: 'FINAL' })),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanManageSchedule(schedule({ type: 'FINAL' })),
    ).resolves.toBeUndefined()
    expect(spy).not.toHaveBeenCalled()
  })

  it('allows curriculum staff to read all and manage MIDTERM/NON_EXAM, but rejects FINAL', async () => {
    const scope = await new ScheduleScopeService(
      employees(null),
      new FakeAcademicLookup(),
    ).forUser(curriculumStaff)

    expect(scope.allRead).toBe(true)
    expect(scope.allManage).toBe(true)
    expect(scope.nonExamOnly).toBe(false)

    await expect(
      scope.assertCanManageActivity(activity({ type: 'MIDTERM' })),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanManageSchedule(schedule({ type: 'MIDTERM' })),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanManageActivity(activity({ type: 'FINAL' })),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      scope.assertCanManageSchedule(schedule({ type: 'FINAL' })),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('gives principal read-all without manage rights', async () => {
    const academic = new FakeAcademicLookup()
    const spy = vi.spyOn(academic, 'teachingAssignmentsOf')
    const scope = await new ScheduleScopeService(
      employees(null),
      academic,
    ).forUser(principal)

    expect(scope.allRead).toBe(true)
    expect(scope.allManage).toBe(false)
    expect(scope.nonExamOnly).toBe(true)

    const all = [
      activity({ id: 'a-daily', type: 'DAILY' }),
      activity({ id: 'a-final', type: 'FINAL' }),
    ]
    await expect(scope.filterActivities(all)).resolves.toEqual(all)
    await expect(
      scope.assertCanReadActivity(activity({ type: 'FINAL' })),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanReadSchedule(schedule({ type: 'FINAL' })),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanManageActivity(activity({ type: 'DAILY' })),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      scope.assertCanManageSchedule(schedule({ type: 'DAILY' })),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(spy).not.toHaveBeenCalled()
  })

  it('scopes teacher activities to NON_EXAM owned or taught subject and grade', async () => {
    const academic = new FakeAcademicLookup({
      assignments: [{ subjectId: 'math', classroomId: CLASSROOM_7A.id }],
      classrooms: [CLASSROOM_7A, CLASSROOM_7B, CLASSROOM_8A],
    })
    const scope = await new ScheduleScopeService(
      employees('emp-1'),
      academic,
    ).forUser(teacher)

    expect(scope.allRead).toBe(false)
    expect(scope.allManage).toBe(false)
    expect(scope.nonExamOnly).toBe(true)

    const taughtDaily = activity({ id: 'taught', subjectId: 'math' })
    const ownedDaily = activity({
      id: 'owned',
      subjectId: 'science',
      gradeId: CLASSROOM_8A.gradeId,
      createdById: teacher.id,
    })
    const otherDaily = activity({
      id: 'other-daily',
      subjectId: 'art',
      gradeId: CLASSROOM_7A.gradeId,
    })
    const otherGradeDaily = activity({
      id: 'other-grade',
      subjectId: 'math',
      gradeId: CLASSROOM_8A.gradeId,
    })
    const midterm = activity({ id: 'midterm', type: 'MIDTERM' })

    const filtered = await scope.filterActivities([
      taughtDaily,
      ownedDaily,
      otherDaily,
      otherGradeDaily,
      midterm,
    ])
    expect(filtered.map((item) => item.id)).toEqual(['taught', 'owned'])

    await expect(
      scope.assertCanReadActivity(taughtDaily),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanReadActivity(ownedDaily),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanReadActivity(otherDaily),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      scope.assertCanReadActivity(otherGradeDaily),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(scope.assertCanReadActivity(midterm)).rejects.toBeInstanceOf(
      ForbiddenException,
    )

    await expect(
      scope.assertCanManageActivity(taughtDaily, [CLASSROOM_7A.id]),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanManageActivity(taughtDaily, [CLASSROOM_7B.id]),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      scope.assertCanManageActivity(otherDaily),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(scope.assertCanManageActivity(midterm)).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it('enforces classroom-level isolation on same-grade same-subject NON_EXAM activities', async () => {
    const academic = new FakeAcademicLookup({
      assignments: [{ subjectId: 'math', classroomId: CLASSROOM_7A.id }],
      classrooms: [CLASSROOM_7A, CLASSROOM_7B],
    })
    const scope = await new ScheduleScopeService(
      employees('emp-1'),
      academic,
    ).forUser(teacher)

    const class7bOnly = {
      ...activity({
        id: 'act-7b',
        subjectId: 'math',
        gradeId: CLASSROOM_7A.gradeId,
        createdById: 'teacher-b',
      }),
      classroomIds: [CLASSROOM_7B.id],
    }
    const class7aAnd7b = {
      ...activity({
        id: 'act-both',
        subjectId: 'math',
        gradeId: CLASSROOM_7A.gradeId,
        createdById: 'admin-1',
      }),
      classroomIds: [CLASSROOM_7A.id, CLASSROOM_7B.id],
    }

    const filtered = await scope.filterActivities([class7bOnly, class7aAnd7b])
    expect(filtered.map((item) => item.id)).toEqual(['act-both'])

    await expect(
      scope.assertCanReadActivity(class7bOnly),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      scope.assertCanManageActivity(class7bOnly),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      scope.assertCanReadActivity(class7aAnd7b),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanManageActivity(class7aAnd7b),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('scopes teacher schedules to taught assignments and preserves MAKEUP for allowed graders', async () => {
    const academic = new FakeAcademicLookup({
      assignments: [{ subjectId: 'math', classroomId: CLASSROOM_7A.id }],
      classrooms: [CLASSROOM_7A, CLASSROOM_7B],
    })
    const scope = await new ScheduleScopeService(
      employees('emp-1'),
      academic,
    ).forUser(teacher)

    const taughtDaily = schedule({ type: 'DAILY' })
    const ownedDaily = schedule({
      subjectId: 'art',
      classroomId: CLASSROOM_7B.id,
      createdById: teacher.id,
    })
    const unrelatedDaily = schedule({
      subjectId: 'art',
      classroomId: CLASSROOM_7B.id,
    })
    const taughtMidterm = schedule({ type: 'MIDTERM', kind: 'REGULAR' })
    const taughtMakeupFinal = schedule({
      type: 'FINAL',
      kind: 'MAKEUP',
      makeupOfId: 'orig-1',
    })
    const untaughtMakeupFinal = schedule({
      type: 'FINAL',
      kind: 'MAKEUP',
      makeupOfId: 'orig-2',
      classroomId: CLASSROOM_7B.id,
      createdById: teacher.id,
    })

    await expect(
      scope.assertCanReadSchedule(taughtDaily),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanReadSchedule(ownedDaily),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanReadSchedule(taughtMidterm),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanReadSchedule(unrelatedDaily),
    ).rejects.toBeInstanceOf(ForbiddenException)

    await expect(
      scope.assertCanManageSchedule(taughtDaily),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanManageSchedule(ownedDaily),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanManageSchedule(taughtMakeupFinal),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanManageSchedule(taughtMidterm),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      scope.assertCanManageSchedule(unrelatedDaily),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      scope.assertCanManageSchedule(untaughtMakeupFinal),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('fails closed when employee is missing or academic lookup fails', async () => {
    const noEmpScope = await new ScheduleScopeService(
      employees(null),
      new FakeAcademicLookup(),
    ).forUser(teacher)

    await expect(
      noEmpScope.assertCanReadSchedule(schedule()),
    ).rejects.toBeInstanceOf(ForbiddenException)

    const failingScope = await new ScheduleScopeService(
      employees('emp-1'),
      new FakeAcademicLookup({
        failWith: new ServiceUnavailableException('down'),
      }),
    ).forUser(teacher)

    await expect(
      failingScope.assertCanReadSchedule(schedule()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
