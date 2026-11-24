import { ForbiddenException } from '@nestjs/common'
import { SUBJECT_ID } from '../../exam-package/application/exam-package.test-support.js'
import type { ExamSchedule } from '../domain/entities/exam-schedule.entity.js'
import {
  CLASSROOM_7A,
  SEMESTER_ID,
  STAFF_USER,
  TEACHER_USER,
  makeupScope,
} from './exam-schedule.test-support.js'

const schedule = {
  id: 'sched-1',
  subjectId: SUBJECT_ID,
  classroomId: CLASSROOM_7A.id,
  semesterId: SEMESTER_ID,
} as ExamSchedule

const OTHER_CLASS = '99999999-9999-4999-8999-999999999999'

describe('MakeupScopeService', () => {
  it('allows exam-grading.read-all to read but refuses write without exam-grading.grade', async () => {
    const scope = makeupScope([])
    const reader = {
      id: 'principal-1',
      roles: ['PRINCIPAL'],
      permissions: ['exam-grading.read', 'exam-grading.read-all'],
    }

    await expect(scope.assertCanRead(reader, schedule)).resolves.toBeUndefined()
    await expect(scope.assertCanWrite(reader, schedule)).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('scopes teacher read and write to taught subject and classroom', async () => {
    const scope = makeupScope()
    const untaught = { ...schedule, classroomId: OTHER_CLASS }

    await expect(
      scope.assertCanRead(TEACHER_USER, schedule),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanWrite(TEACHER_USER, schedule),
    ).resolves.toBeUndefined()
    await expect(scope.assertCanRead(TEACHER_USER, untaught)).rejects.toThrow(
      ForbiddenException,
    )
    await expect(scope.assertCanWrite(TEACHER_USER, untaught)).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('allows exam-grading.manage-all for both read and write', async () => {
    const scope = makeupScope([])
    const untaught = { ...schedule, classroomId: OTHER_CLASS }

    await expect(
      scope.assertCanRead(STAFF_USER, untaught),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanWrite(STAFF_USER, untaught),
    ).resolves.toBeUndefined()
  })
})
