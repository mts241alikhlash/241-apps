import 'reflect-metadata'
import { ForbiddenException } from '@nestjs/common'
import { PERMISSIONS_KEY } from '@mts241alikhlash/nest-core/access-control'
import { describe, expect, it } from 'vitest'
import { FakeExamPackageRepository } from '../../../exam-package/application/exam-package.repository.fake.js'
import { SUBJECT_ID } from '../../../exam-package/application/exam-package.test-support.js'
import { FakeExamRoomRepository } from '../../../exam-room/application/exam-room.repository.fake.js'
import type { IEmployeeIdentityReadPort } from '../../../platform/employee-identity/employee-identity.port.js'
import { FakeQuestionRepository } from '../../../question/application/question.repository.fake.js'
import { AccessCodeService } from '../../application/access-code.service.js'
import { FakeExamScheduleRepository } from '../../application/exam-schedule.repository.fake.js'
import {
  CLASSROOM_7A,
  END,
  FakeAcademicLookup,
  SEMESTER_ID,
  START,
  YEAR_ID,
  approvedPackage,
} from '../../application/exam-schedule.test-support.js'
import { FakeScheduleSessionGuard } from '../../application/schedule-session-guard.fake.js'
import {
  ScheduleScopeService,
  type ScheduleAccessUser,
} from '../../application/schedule-scope.service.js'
import { CancelExamScheduleUseCase } from '../../application/use-cases/cancel-exam-schedule/cancel-exam-schedule.use-case.js'
import { CreateExamScheduleUseCase } from '../../application/use-cases/create-exam-schedule/create-exam-schedule.use-case.js'
import { GetAccessCodeUseCase } from '../../application/use-cases/get-access-code/get-access-code.use-case.js'
import { GetExamScheduleUseCase } from '../../application/use-cases/get-exam-schedule/get-exam-schedule.use-case.js'
import { ListExamSchedulesUseCase } from '../../application/use-cases/list-exam-schedules/list-exam-schedules.use-case.js'
import { RotateAccessCodeUseCase } from '../../application/use-cases/rotate-access-code/rotate-access-code.use-case.js'
import { UpdateExamScheduleUseCase } from '../../application/use-cases/update-exam-schedule/update-exam-schedule.use-case.js'
import { ExamScheduleController } from './exam-schedule.controller.js'

const expected: Record<string, string[]> = {
  findAll: ['exam-schedules.read'],
  findOne: ['exam-schedules.read'],
  create: ['exam-schedules.create'],
  update: ['exam-schedules.update'],
  cancel: ['exam-schedules.cancel'],
  accessCode: ['exam-schedules.access-code'],
  rotateAccessCode: ['exam-schedules.access-code'],
}

const CLASSROOM_7B = {
  id: '77777777-7777-4777-8777-777777777778',
  gradeId: CLASSROOM_7A.gradeId,
  academicYearId: YEAR_ID,
  name: 'VII B',
}

const teacher: ScheduleAccessUser = {
  id: 'teacher-1',
  roles: ['TEACHER'],
  permissions: [
    'exam-schedules.read',
    'exam-schedules.create',
    'exam-schedules.update',
    'exam-schedules.cancel',
    'exam-schedules.access-code',
  ],
}

const principal: ScheduleAccessUser = {
  id: 'principal-1',
  roles: ['PRINCIPAL'],
  permissions: ['exam-schedules.read', 'exam-events.read'],
}

const examAdmin: ScheduleAccessUser = {
  id: 'admin-1',
  roles: ['EXAM_ADMIN'],
  permissions: [
    'exam-schedules.read',
    'exam-schedules.create',
    'exam-schedules.update',
    'exam-schedules.cancel',
    'exam-schedules.manage-all',
    'exam-schedules.access-code',
    'exam-events.read',
    'exam-events.manage',
  ],
}

async function build() {
  const packages = new FakeExamPackageRepository()
  const schedules = new FakeExamScheduleRepository(packages)
  const rooms = new FakeExamRoomRepository()
  const guard = new FakeScheduleSessionGuard()
  const academic = new FakeAcademicLookup({
    semesterId: SEMESTER_ID,
    assignments: [{ subjectId: SUBJECT_ID, classroomId: CLASSROOM_7A.id }],
    classrooms: [CLASSROOM_7A, CLASSROOM_7B],
  })
  const employees = {
    findEmployeeIdByUserId: () => Promise.resolve('emp-1'),
    employeeExists: () => Promise.resolve(true),
  } as IEmployeeIdentityReadPort
  const scheduleScope = new ScheduleScopeService(employees, academic)
  const codes = new AccessCodeService('test-secret-that-is-long-enough-1234')
  const pkg = await approvedPackage(packages, new FakeQuestionRepository())

  const controller = new ExamScheduleController(
    new ListExamSchedulesUseCase(schedules, academic, guard, scheduleScope),
    new GetExamScheduleUseCase(schedules, academic, guard),
    new CreateExamScheduleUseCase(
      schedules,
      packages,
      academic,
      rooms,
      scheduleScope,
    ),
    new UpdateExamScheduleUseCase(schedules, guard, rooms),
    new CancelExamScheduleUseCase(schedules, guard),
    new GetAccessCodeUseCase(schedules, codes),
    new RotateAccessCodeUseCase(schedules, codes),
    schedules,
    scheduleScope,
  )

  return { controller, schedules, rooms, pkg }
}

describe('ExamScheduleController permissions', () => {
  it.each(Object.entries(expected))('%s requires %j', (method, codes) => {
    const handler = ExamScheduleController.prototype[
      method as keyof ExamScheduleController
    ] as unknown as object

    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual(codes)
  })

  it('leaves no route without a permission', () => {
    const routes = Object.getOwnPropertyNames(
      ExamScheduleController.prototype,
    ).filter((name) => name !== 'constructor')

    expect(routes.sort()).toEqual(Object.keys(expected).sort())
  })
})

describe('ExamScheduleController scoping', () => {
  it('filters findAll to teacher assignments while principal sees all', async () => {
    const { controller, schedules, pkg } = await build()
    const taught = await schedules.createAndLockPackage({
      packageId: pkg.id,
      classroomId: CLASSROOM_7A.id,
      semesterId: SEMESTER_ID,
      startsAt: START,
      endsAt: END,
      durationMinutes: 90,
      type: 'DAILY',
      createdById: 'other-teacher',
    })
    const untaught = await schedules.createAndLockPackage({
      packageId: pkg.id,
      classroomId: CLASSROOM_7B.id,
      semesterId: SEMESTER_ID,
      startsAt: START,
      endsAt: END,
      durationMinutes: 90,
      type: 'DAILY',
      createdById: 'other-teacher',
    })

    const teacherPage = await controller.findAll(teacher, {
      page: 1,
      limit: 10,
    })
    expect(teacherPage.data.map((row) => row.id)).toEqual([taught!.id])

    const principalPage = await controller.findAll(principal, {
      page: 1,
      limit: 10,
    })
    expect(principalPage.total).toBe(2)

    await expect(
      controller.findOne(principal, untaught!.id),
    ).resolves.toMatchObject({ id: untaught!.id })
    await expect(
      controller.findOne(teacher, untaught!.id),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('rejects teacher write/token endpoints on EXAM or untaught schedules and allows taught MAKEUP', async () => {
    const { controller, schedules, rooms, pkg } = await build()
    const event = await rooms.createEvent({
      semesterId: SEMESTER_ID,
      name: 'UTS',
      type: 'MIDTERM',
      startsAt: START,
      endsAt: END,
      createdById: examAdmin.id,
    })
    const active = (await rooms.updateEvent(event.id, { status: 'ACTIVE' }))!

    const midterm = (await schedules.createAndLockPackage({
      packageId: pkg.id,
      classroomId: CLASSROOM_7A.id,
      semesterId: SEMESTER_ID,
      eventId: active.id,
      startsAt: START,
      endsAt: END,
      durationMinutes: 90,
      type: 'MIDTERM',
      createdById: examAdmin.id,
    }))!
    const untaught = (await schedules.createAndLockPackage({
      packageId: pkg.id,
      classroomId: CLASSROOM_7B.id,
      semesterId: SEMESTER_ID,
      startsAt: START,
      endsAt: END,
      durationMinutes: 90,
      type: 'DAILY',
      createdById: 'other-teacher',
    }))!
    const makeup = (await schedules.createMakeup({
      packageId: pkg.id,
      classroomId: CLASSROOM_7A.id,
      semesterId: SEMESTER_ID,
      startsAt: new Date('2026-11-03T01:00:00.000Z'),
      endsAt: new Date('2026-11-03T04:00:00.000Z'),
      durationMinutes: 90,
      type: 'MIDTERM',
      createdById: teacher.id,
      makeupOfId: midterm.id,
      participants: [{ studentId: 'st-1', reason: 'SICK', note: null }],
    }))!

    const futureStart = new Date(Date.now() + 3600_000).toISOString()
    const futureEnd = new Date(Date.now() + 7200_000).toISOString()

    await expect(
      controller.create(teacher, {
        packageId: pkg.id,
        classroomId: CLASSROOM_7A.id,
        startsAt: futureStart,
        endsAt: futureEnd,
        durationMinutes: 45,
        type: 'MIDTERM',
        eventId: active.id,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)

    await expect(
      controller.create(teacher, {
        packageId: pkg.id,
        classroomId: CLASSROOM_7B.id,
        startsAt: futureStart,
        endsAt: futureEnd,
        durationMinutes: 45,
        type: 'DAILY',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)

    await expect(
      controller.create(teacher, {
        packageId: pkg.id,
        classroomId: CLASSROOM_7A.id,
        startsAt: futureStart,
        endsAt: futureEnd,
        durationMinutes: 45,
        type: 'DAILY',
      }),
    ).resolves.toMatchObject({ type: 'DAILY' })

    for (const targetId of [midterm.id, untaught.id]) {
      await expect(
        controller.update(targetId, teacher, {
          startsAt: START.toISOString(),
          endsAt: END.toISOString(),
          durationMinutes: 90,
          type: 'DAILY',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException)
      await expect(controller.cancel(teacher, targetId)).rejects.toBeInstanceOf(
        ForbiddenException,
      )
      await expect(
        controller.accessCode(teacher, targetId),
      ).rejects.toBeInstanceOf(ForbiddenException)
      await expect(
        controller.rotateAccessCode(teacher, targetId),
      ).rejects.toBeInstanceOf(ForbiddenException)
    }

    await expect(
      controller.accessCode(teacher, makeup.id),
    ).resolves.toMatchObject({ accessCode: expect.any(String) as string })
    await expect(
      controller.rotateAccessCode(teacher, makeup.id),
    ).resolves.toMatchObject({ rotation: 1 })
    await expect(
      controller.update(makeup.id, teacher, {
        startsAt: new Date('2026-11-03T02:00:00.000Z').toISOString(),
        endsAt: new Date('2026-11-03T05:00:00.000Z').toISOString(),
        durationMinutes: 90,
        type: 'MIDTERM',
      }),
    ).resolves.toMatchObject({ id: makeup.id })
    await expect(controller.cancel(teacher, makeup.id)).resolves.toBeUndefined()
  })
})
