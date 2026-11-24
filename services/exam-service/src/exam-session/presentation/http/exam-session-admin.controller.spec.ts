import 'reflect-metadata'
import { ForbiddenException } from '@nestjs/common'
import {
  PERMISSIONS_ANY_KEY,
  PERMISSIONS_KEY,
} from '@mts241alikhlash/nest-core/access-control'
import { describe, expect, it } from 'vitest'
import { FakeExamPackageRepository } from '../../../exam-package/application/exam-package.repository.fake.js'
import { SUBJECT_ID } from '../../../exam-package/application/exam-package.test-support.js'
import { FakeExamScheduleRepository } from '../../../exam-schedule/application/exam-schedule.repository.fake.js'
import {
  CLASSROOM_7A,
  END,
  FakeAcademicLookup,
  SEMESTER_ID,
  START,
  YEAR_ID,
  approvedPackage,
} from '../../../exam-schedule/application/exam-schedule.test-support.js'
import {
  ScheduleScopeService,
  type ScheduleAccessUser,
} from '../../../exam-schedule/application/schedule-scope.service.js'
import type { IEmployeeIdentityReadPort } from '../../../platform/employee-identity/employee-identity.port.js'
import type { IParticipantNumberPort } from '../../../platform/participant-number/participant-number.port.js'
import type { IStudentDirectoryPort } from '../../../platform/student-directory/student-directory.port.js'
import { FakeQuestionRepository } from '../../../question/application/question.repository.fake.js'
import type { GetSessionTimelineUseCase } from '../../../exam-room/application/use-cases/get-session-timeline/get-session-timeline.use-case.js'
import { FakeExamSessionRepository } from '../../application/exam-session.repository.fake.js'
import type { ExtendSessionTimeUseCase } from '../../application/use-cases/extend-session-time/extend-session-time.use-case.js'
import { ListScheduleSessionsUseCase } from '../../application/use-cases/list-schedule-sessions/list-schedule-sessions.use-case.js'
import type { ListSessionAuditLogsUseCase } from '../../application/use-cases/list-session-audit-logs/list-session-audit-logs.use-case.js'
import type { ReleaseSessionUseCase } from '../../application/use-cases/release-session/release-session.use-case.js'
import type { ReopenSessionUseCase } from '../../application/use-cases/reopen-session/reopen-session.use-case.js'
import type { ResetSessionUseCase } from '../../application/use-cases/reset-session/reset-session.use-case.js'
import { ExamSessionAdminController } from './exam-session-admin.controller.js'

const expected: Record<string, string[]> = {
  findBySchedule: ['exam-sessions.read'],
  release: ['exam-sessions.release'],
}

const anyExpected: Record<string, string[]> = {
  auditLogs: ['exam-rooms.supervise', 'exam-rooms.manage-all'],
  sessionTimeline: ['exam-rooms.supervise', 'exam-rooms.manage-all'],
  reopen: ['exam-rooms.technician', 'exam-rooms.manage-all'],
  reset: ['exam-rooms.technician', 'exam-rooms.manage-all'],
  extendTime: ['exam-rooms.technician', 'exam-rooms.manage-all'],
}

const CLASSROOM_7B = {
  id: '77777777-7777-4777-8777-777777777778',
  gradeId: CLASSROOM_7A.gradeId,
  academicYearId: YEAR_ID,
  name: 'VII B',
}

describe('ExamSessionAdminController permissions', () => {
  it.each(Object.entries(expected))('%s requires %j', (method, codes) => {
    const handler = ExamSessionAdminController.prototype[
      method as keyof ExamSessionAdminController
    ] as unknown as object

    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual(codes)
  })

  it.each(Object.entries(anyExpected))(
    '%s accepts any of %j so manage-all reaches it',
    (method, codes) => {
      const handler = ExamSessionAdminController.prototype[
        method as keyof ExamSessionAdminController
      ] as unknown as object

      expect(Reflect.getMetadata(PERMISSIONS_ANY_KEY, handler)).toEqual(codes)
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toBeUndefined()
    },
  )

  it('leaves no route without a permission', () => {
    const routes = Object.getOwnPropertyNames(
      ExamSessionAdminController.prototype,
    ).filter((name) => name !== 'constructor')

    expect(routes.sort()).toEqual(
      [...Object.keys(expected), ...Object.keys(anyExpected)].sort(),
    )
  })
})

describe('ExamSessionAdminController.findBySchedule scoping', () => {
  it('allows principal and teaching teacher, and rejects unrelated schedule for teacher', async () => {
    const packages = new FakeExamPackageRepository()
    const schedules = new FakeExamScheduleRepository(packages)
    const sessions = new FakeExamSessionRepository()
    const pkg = await approvedPackage(packages, new FakeQuestionRepository())
    const taught = (await schedules.createAndLockPackage({
      packageId: pkg.id,
      classroomId: CLASSROOM_7A.id,
      semesterId: SEMESTER_ID,
      startsAt: START,
      endsAt: END,
      durationMinutes: 90,
      type: 'DAILY',
      createdById: 'other-teacher',
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
    const students = {
      refsByIds: () => Promise.resolve([]),
    } as unknown as IStudentDirectoryPort
    const participantNumbers = {
      findNumbers: () => Promise.resolve(new Map()),
    } as unknown as IParticipantNumberPort

    const controller = new ExamSessionAdminController(
      new ListScheduleSessionsUseCase(
        schedules,
        sessions,
        students,
        participantNumbers,
        scheduleScope,
      ),
      {} as ReleaseSessionUseCase,
      {} as ReopenSessionUseCase,
      {} as ResetSessionUseCase,
      {} as ExtendSessionTimeUseCase,
      {} as ListSessionAuditLogsUseCase,
      {} as GetSessionTimelineUseCase,
    )

    const teacher: ScheduleAccessUser = {
      id: 'teacher-1',
      roles: ['TEACHER'],
      permissions: ['exam-sessions.read'],
    }
    const principal: ScheduleAccessUser = {
      id: 'principal-1',
      roles: ['PRINCIPAL'],
      permissions: ['exam-sessions.read', 'exam-events.read'],
    }

    await expect(
      controller.findBySchedule(teacher, taught.id, { page: 1, limit: 10 }),
    ).resolves.toMatchObject({ total: 0 })
    await expect(
      controller.findBySchedule(teacher, untaught.id, { page: 1, limit: 10 }),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      controller.findBySchedule(principal, untaught.id, { page: 1, limit: 10 }),
    ).resolves.toMatchObject({ total: 0 })
  })
})
