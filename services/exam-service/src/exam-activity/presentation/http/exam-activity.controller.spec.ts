import 'reflect-metadata'
import { ForbiddenException, ValidationPipe } from '@nestjs/common'
import {
  PERMISSIONS_ANY_KEY,
  PERMISSIONS_KEY,
} from '@mts241alikhlash/nest-core/access-control'
import { describe, expect, it, vi } from 'vitest'
import {
  CLASSROOM_7A,
  FakeAcademicLookup,
  SEMESTER_ID,
  YEAR_ID,
} from '../../../exam-schedule/application/exam-schedule.test-support.js'
import {
  ScheduleScopeService,
  type ScheduleAccessUser,
} from '../../../exam-schedule/application/schedule-scope.service.js'
import type { IEmployeeIdentityReadPort } from '../../../platform/employee-identity/employee-identity.port.js'
import { IParticipantNumberPort } from '../../../platform/participant-number/participant-number.port.js'
import { FakeExamActivityRepository } from '../../application/exam-activity.repository.fake.js'
import { AssignActivityClassroomsUseCase } from '../../application/use-cases/assign-activity-classrooms/assign-activity-classrooms.use-case.js'
import { AttachActivityPackageUseCase } from '../../application/use-cases/attach-activity-package/attach-activity-package.use-case.js'
import { GetActivityReadinessUseCase } from '../../application/use-cases/get-activity-readiness/get-activity-readiness.use-case.js'
import { UpdateActivityAutoStatusUseCase } from '../../application/use-cases/update-activity-auto-status/update-activity-auto-status.use-case.js'
import { CreateActivityUseCase } from '../../application/use-cases/create-activity/create-activity.use-case.js'
import type { IssueParticipantNumbersUseCase } from '../../application/use-cases/issue-participant-numbers/issue-participant-numbers.use-case.js'
import { ListActivitiesUseCase } from '../../application/use-cases/list-activities/list-activities.use-case.js'
import { UpdateActivityStatusUseCase } from '../../application/use-cases/update-activity-status/update-activity-status.use-case.js'
import type {
  RotateActivityTokenUseCase,
  UpdateActivityPolicyUseCase,
} from '../../application/use-cases/update-activity-policy/update-activity-policy.use-case.js'
import type { CloseActivitySessionsUseCase } from '../../../exam-session/application/use-cases/close-activity-sessions/close-activity-sessions.use-case.js'
import type { ExamActivity } from '../../domain/entities/exam-activity.entity.js'
import { DEFAULT_POLICIES } from '../../domain/policies/exam-policy.policy.js'
import { AssignActivityClassroomsRequestDto } from './dto/exam-activity.dto.js'
import { ExamActivityController } from './exam-activity.controller.js'

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
  permissions: [
    'exam-schedules.read',
    'exam-schedules.manage',
    'exam-schedules.manage-all',
    'exam-events.read',
    'exam-events.manage',
  ],
}

function makeActivity(overrides: Partial<ExamActivity> = {}): ExamActivity {
  return {
    id: 'activity-1',
    semesterId: SEMESTER_ID,
    eventId: null,
    gradeId: CLASSROOM_7A.gradeId,
    subjectId: 'subject-math',
    packageId: 'package-1',
    type: 'DAILY',
    tokenMode: 'ROTATING',
    tokenRotation: 0,
    presetId: 'preset-DAILY',
    policy: { ...DEFAULT_POLICIES.DAILY },
    startsAt: new Date('2026-11-10T01:00:00Z'),
    endsAt: new Date('2026-11-10T04:00:00Z'),
    durationMinutes: 90,
    status: 'DRAFT',
    deliveryMode: 'ONLINE',
    offlineKind: null,
    maxScore: 100,
    autoStatus: true,
    createdById: 'other-user',
    ...overrides,
  }
}

function build(
  assignments: { subjectId: string; classroomId: string }[] = [
    { subjectId: 'subject-math', classroomId: CLASSROOM_7A.id },
  ],
) {
  const repo = new FakeExamActivityRepository()
  const academic = new FakeAcademicLookup({
    semesterId: SEMESTER_ID,
    assignments,
    classrooms: [CLASSROOM_7A, CLASSROOM_7B, CLASSROOM_8A],
  })
  const employees = {
    findEmployeeIdByUserId: () => Promise.resolve('emp-1'),
    employeeExists: () => Promise.resolve(true),
  } as IEmployeeIdentityReadPort
  const scope = new ScheduleScopeService(employees, academic)
  const participants = {
    findNumber: () => Promise.resolve(null),
    findNumbers: () => Promise.resolve(new Map()),
    issueNumbers: () => Promise.resolve({ issued: 0, skipped: [] }),
  } as unknown as IParticipantNumberPort
  const issue = vi.fn().mockResolvedValue({ issued: true })
  const closeSessions = {
    execute: vi.fn().mockResolvedValue(0),
  } as unknown as CloseActivitySessionsUseCase

  const readiness = {
    execute: vi.fn().mockResolvedValue([]),
  } as unknown as GetActivityReadinessUseCase
  const controller = new ExamActivityController(
    new CreateActivityUseCase(repo, participants),
    new ListActivitiesUseCase(repo, academic, scope),
    new UpdateActivityStatusUseCase(repo, closeSessions, scope),
    {} as UpdateActivityPolicyUseCase,
    {} as RotateActivityTokenUseCase,
    { execute: issue } as unknown as IssueParticipantNumbersUseCase,
    new AttachActivityPackageUseCase(repo, scope, academic),
    new AssignActivityClassroomsUseCase(repo, scope, academic),
    readiness,
    new UpdateActivityAutoStatusUseCase(repo, scope),
    scope,
  )

  return { repo, controller, issue, readiness }
}

const exactExpected: Record<string, string[]> = {
  changeStatus: ['exam-schedules.manage'],
  switchAutoStatus: ['exam-schedules.manage'],
  create: ['exam-schedules.manage'],
  attach: ['exam-schedules.manage'],
  assign: ['exam-schedules.manage'],
  policy: ['exam-schedules.manage-all'],
  rotate: ['exam-schedules.manage-all'],
}

const anyExpected: Record<string, string[]> = {
  list: [
    'exam-schedules.read',
    'exam-schedules.manage',
    'exam-schedules.manage-all',
    'exam-events.read',
  ],
  readinessOfDay: [
    'exam-schedules.read',
    'exam-schedules.manage',
    'exam-schedules.manage-all',
    'exam-events.read',
  ],
  findOne: [
    'exam-schedules.read',
    'exam-schedules.manage',
    'exam-schedules.manage-all',
    'exam-events.read',
  ],
  issueNumbers: ['exam-events.manage', 'exam-schedules.manage-all'],
}

describe('ExamActivityController', () => {
  it.each(Object.entries(exactExpected))('%s requires %j', (method, codes) => {
    const handler = ExamActivityController.prototype[
      method as keyof ExamActivityController
    ] as unknown as object

    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual(codes)
  })

  it.each(Object.entries(anyExpected))(
    '%s accepts any of %j',
    (method, codes) => {
      const handler = ExamActivityController.prototype[
        method as keyof ExamActivityController
      ] as unknown as object

      expect(Reflect.getMetadata(PERMISSIONS_ANY_KEY, handler)).toEqual(codes)
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toBeUndefined()
    },
  )

  it('leaves no route without a permission', () => {
    const routes = Object.getOwnPropertyNames(
      ExamActivityController.prototype,
    ).filter((name) => name !== 'constructor')

    expect(routes.sort()).toEqual(
      [...Object.keys(exactExpected), ...Object.keys(anyExpected)].sort(),
    )
  })

  it('declares the static readiness route before the id routes', () => {
    const names = Object.getOwnPropertyNames(ExamActivityController.prototype)
    const path = (name: string) =>
      Reflect.getMetadata(
        'path',
        ExamActivityController.prototype[name as keyof ExamActivityController],
      )

    expect(path('readinessOfDay')).toBe('readiness')
    expect(path('findOne')).toBe(':id')
    expect(names.indexOf('readinessOfDay')).toBeLessThan(
      names.indexOf('findOne'),
    )
  })

  it('passes the query and the user to the readiness use case', async () => {
    const { controller, readiness } = build()
    vi.mocked(readiness.execute).mockResolvedValueOnce([
      {
        activityId: 'activity-1',
        subjectName: 'Matematika',
        gradeName: 'Kelas 7',
        startsAt: new Date('2026-11-10T01:00:00Z'),
        deliveryMode: 'OFFLINE',
        checks: [{ key: 'LATE_TOLERANCE', ok: true, detail: 'x' }],
      },
    ])

    const rows = await controller.readinessOfDay(examAdmin, {
      date: '2026-11-10',
    })

    expect(readiness.execute).toHaveBeenCalledWith(examAdmin, {
      date: '2026-11-10',
    })
    expect(rows[0]).toMatchObject({
      activityId: 'activity-1',
      startsAt: '2026-11-10T01:00:00.000Z',
      checks: [{ key: 'LATE_TOLERANCE', ok: true, detail: 'x' }],
    })
  })

  it('switches the automatic status of an activity', async () => {
    const { controller, repo } = build()
    repo.activities.set('activity-1', makeActivity())

    const dto = await controller.switchAutoStatus(examAdmin, 'activity-1', {
      autoStatus: false,
    })

    expect(dto.autoStatus).toBe(false)
    expect(repo.autoStatusAudits).toHaveLength(1)
  })

  it('answers whether the registry issued the numbers', async () => {
    const { controller, issue } = build()
    issue.mockResolvedValueOnce({ issued: true })

    await expect(controller.issueNumbers('activity-1')).resolves.toEqual({
      issued: true,
    })
    expect(issue).toHaveBeenCalledWith('activity-1')
  })

  it('scopes teacher list and detail to taught or owned NON_EXAM activities', async () => {
    const { repo, controller } = build()
    const taughtDaily = makeActivity({ id: 'a-taught' })
    const ownedDaily = makeActivity({
      id: 'a-owned',
      subjectId: 'subject-art',
      createdById: teacher.id,
    })
    const otherDaily = makeActivity({
      id: 'a-other',
      subjectId: 'subject-art',
      createdById: 'someone-else',
    })
    const midterm = makeActivity({ id: 'a-midterm', type: 'MIDTERM' })

    repo.activities.set(taughtDaily.id, taughtDaily)
    repo.activities.set(ownedDaily.id, ownedDaily)
    repo.activities.set(otherDaily.id, otherDaily)
    repo.activities.set(midterm.id, midterm)

    const teacherRows = await controller.list(teacher, {})
    expect(teacherRows.map((row) => row.id)).toEqual(['a-taught', 'a-owned'])

    const principalRows = await controller.list(principal, {})
    expect(principalRows).toHaveLength(4)

    await expect(
      controller.findOne(principal, midterm.id),
    ).resolves.toMatchObject({ id: midterm.id })
    await expect(
      controller.findOne(teacher, taughtDaily.id),
    ).resolves.toMatchObject({ id: taughtDaily.id })
    await expect(
      controller.findOne(teacher, midterm.id),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      controller.findOne(teacher, otherDaily.id),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('blocks teacher write operations on EXAM or untaught/unowned activities', async () => {
    const { repo, controller } = build()
    repo.events.set('event-pts', {
      semesterId: SEMESTER_ID,
      type: 'MIDTERM',
      status: 'ACTIVE',
      startsAt: new Date('2026-11-10T00:00:00Z'),
      endsAt: new Date('2026-11-10T06:00:00Z'),
    })
    const otherDaily = makeActivity({
      id: 'a-other',
      subjectId: 'subject-art',
      packageId: null,
      createdById: 'other-teacher',
    })
    const midterm = makeActivity({
      id: 'a-midterm',
      type: 'MIDTERM',
      packageId: null,
      createdById: 'admin-1',
    })
    const ownedDraft = makeActivity({
      id: 'a-owned',
      packageId: null,
      createdById: teacher.id,
    })
    repo.activities.set(otherDaily.id, otherDaily)
    repo.activities.set(midterm.id, midterm)
    repo.activities.set(ownedDraft.id, ownedDraft)

    await expect(
      controller.create(teacher, {
        semesterId: SEMESTER_ID,
        eventId: 'event-pts',
        gradeId: CLASSROOM_7A.gradeId,
        subjectId: 'subject-math',
        packageId: 'package-1',
        type: 'MIDTERM',
        classroomIds: [CLASSROOM_7A.id],
        tokenMode: 'ROTATING',
        startsAt: '2026-11-10T01:00:00Z',
        endsAt: '2026-11-10T03:00:00Z',
        durationMinutes: 90,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)

    await expect(
      controller.create(teacher, {
        semesterId: SEMESTER_ID,
        gradeId: CLASSROOM_7A.gradeId,
        subjectId: 'subject-art',
        packageId: 'package-1',
        type: 'DAILY',
        classroomIds: [CLASSROOM_7A.id],
        tokenMode: 'STATIC',
        startsAt: '2026-11-10T01:00:00Z',
        endsAt: '2026-11-10T03:00:00Z',
        durationMinutes: 90,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)

    await expect(
      controller.create(teacher, {
        semesterId: SEMESTER_ID,
        gradeId: CLASSROOM_7A.gradeId,
        subjectId: 'subject-math',
        packageId: 'package-1',
        type: 'DAILY',
        classroomIds: [CLASSROOM_7A.id],
        tokenMode: 'STATIC',
        startsAt: '2026-11-10T01:00:00Z',
        endsAt: '2026-11-10T03:00:00Z',
        durationMinutes: 90,
      }),
    ).resolves.toMatchObject({ type: 'DAILY' })

    await expect(
      controller.create(curriculumStaff, {
        semesterId: SEMESTER_ID,
        eventId: 'event-pts',
        gradeId: CLASSROOM_7A.gradeId,
        subjectId: 'subject-math',
        packageId: 'package-1',
        type: 'MIDTERM',
        classroomIds: [CLASSROOM_7A.id],
        tokenMode: 'ROTATING',
        startsAt: '2026-11-10T01:00:00Z',
        endsAt: '2026-11-10T03:00:00Z',
        durationMinutes: 90,
      }),
    ).resolves.toMatchObject({ type: 'MIDTERM' })

    await expect(
      controller.create(examAdmin, {
        semesterId: SEMESTER_ID,
        eventId: 'event-pts',
        gradeId: CLASSROOM_7A.gradeId,
        subjectId: 'subject-math',
        packageId: 'package-1',
        type: 'MIDTERM',
        classroomIds: [CLASSROOM_7A.id],
        tokenMode: 'ROTATING',
        startsAt: '2026-11-10T01:00:00Z',
        endsAt: '2026-11-10T03:00:00Z',
        durationMinutes: 90,
      }),
    ).resolves.toMatchObject({ type: 'MIDTERM' })

    await expect(
      controller.changeStatus(teacher, otherDaily.id, { status: 'CLOSED' }),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      controller.changeStatus(teacher, midterm.id, { status: 'CLOSED' }),
    ).rejects.toBeInstanceOf(ForbiddenException)

    await expect(
      controller.attach(teacher, otherDaily.id, {
        packageId: 'package-1',
        classroomIds: [CLASSROOM_7A.id],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      controller.attach(teacher, midterm.id, {
        packageId: 'package-1',
        classroomIds: [CLASSROOM_7A.id],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)

    await expect(
      controller.attach(teacher, ownedDraft.id, {
        packageId: 'package-1',
        classroomIds: [CLASSROOM_7A.id],
      }),
    ).resolves.toMatchObject({ packageId: 'package-1' })
    await expect(
      controller.changeStatus(teacher, ownedDraft.id, { status: 'SCHEDULED' }),
    ).resolves.toMatchObject({ status: 'SCHEDULED' })
  })

  it('assigns classrooms to an offline activity and answers with the detail', async () => {
    const { repo, controller } = build()
    const offline = makeActivity({
      id: 'a-offline',
      packageId: null,
      deliveryMode: 'OFFLINE',
      offlineKind: 'WRITTEN',
      createdById: teacher.id,
    })
    repo.activities.set(offline.id, offline)

    const detail = await controller.assign(teacher, offline.id, {
      classroomIds: [CLASSROOM_7A.id],
    })
    await controller.assign(teacher, offline.id, {
      classroomIds: [CLASSROOM_7A.id],
    })

    expect(detail.schedules.map((row) => row.classroomId)).toEqual([
      CLASSROOM_7A.id,
    ])
    expect(repo.scheduleRecords).toHaveLength(1)
    await expect(
      controller.assign(teacher, makeActivity({ id: 'x' }).id, {
        classroomIds: [CLASSROOM_7A.id],
      }),
    ).rejects.toBeDefined()
    await expect(
      controller.assign(teacher, offline.id, {
        classroomIds: [CLASSROOM_8A.id],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it.each([
    [{ classroomIds: [] }],
    [{}],
    [{ classroomIds: ['not-a-uuid'] }],
    [{ classroomIds: 'x' }],
  ])('rejects the assign body %j', async (body) => {
    const pipe = new ValidationPipe({ whitelist: true })

    await expect(
      pipe.transform(body, {
        type: 'body',
        metatype: AssignActivityClassroomsRequestDto,
      }),
    ).rejects.toBeDefined()
  })

  it('accepts a list of classroom uuids', async () => {
    const pipe = new ValidationPipe({ whitelist: true })

    await expect(
      pipe.transform(
        { classroomIds: [CLASSROOM_7A.id] },
        { type: 'body', metatype: AssignActivityClassroomsRequestDto },
      ),
    ).resolves.toEqual({ classroomIds: [CLASSROOM_7A.id] })
  })

  it('prevents Teacher A (7A) from listing, inspecting, or closing Teacher B (7B) activity in the same grade and subject', async () => {
    const { repo, controller } = build([
      { subjectId: 'subject-math', classroomId: CLASSROOM_7A.id },
    ])
    const teacherBActivity = makeActivity({
      id: 'a-teacher-b-7b',
      subjectId: 'subject-math',
      gradeId: CLASSROOM_7A.gradeId,
      status: 'ACTIVE',
      createdById: 'teacher-b',
    })
    repo.activities.set(teacherBActivity.id, teacherBActivity)
    repo.activitySchedules.set(teacherBActivity.id, [
      {
        id: 'sched-7b',
        classroomId: CLASSROOM_7B.id,
        startsAt: teacherBActivity.startsAt,
        endsAt: teacherBActivity.endsAt,
      },
    ])

    await expect(controller.list(teacher, {})).resolves.toEqual([])
    await expect(
      controller.findOne(teacher, teacherBActivity.id),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      controller.changeStatus(teacher, teacherBActivity.id, {
        status: 'CLOSED',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })
})
