import { ForbiddenException } from '@nestjs/common'
import { SUBJECT_ID } from '../../exam-package/application/exam-package.test-support.js'
import type { ExamSchedule } from '../domain/entities/exam-schedule.entity.js'
import {
  CLASSROOM_7A,
  COMMITTEE_USER,
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
  type: 'DAILY',
} as ExamSchedule

const examSchedule = { ...schedule, type: 'FINAL' } as ExamSchedule

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

  it('lets the exam committee read and write makeups of an exam and of non-exam work', async () => {
    const scope = makeupScope([])

    for (const target of [examSchedule, schedule]) {
      await expect(
        scope.assertCanRead(COMMITTEE_USER, target),
      ).resolves.toBeUndefined()
      await expect(
        scope.assertCanWrite(COMMITTEE_USER, target),
      ).resolves.toBeUndefined()
    }
  })

  it('accepts exam-schedules.manage-all as the exam committee', async () => {
    const scope = makeupScope([])
    const curriculum = {
      id: 'curriculum-1',
      roles: ['Wakamad Kurikulum'],
      permissions: ['exam-schedules.manage-all', 'exam-grading.read-all'],
    }

    await expect(
      scope.assertCanWrite(curriculum, examSchedule),
    ).resolves.toBeUndefined()
  })

  it('refuses a teacher who teaches the class writing a makeup of an exam, but lets them read it', async () => {
    const scope = makeupScope()

    await expect(
      scope.assertCanRead(TEACHER_USER, examSchedule),
    ).resolves.toBeUndefined()
    await expect(
      scope.assertCanWrite(TEACHER_USER, examSchedule),
    ).rejects.toMatchObject({
      code: 'EXAM_ADMIN_ONLY',
      message:
        'Jadwal ujian hanya dapat dikelola oleh panitia atau admin ujian.',
    })
  })

  it('refuses a teacher who does not teach the class reading a makeup of an exam', async () => {
    const scope = makeupScope([])

    await expect(
      scope.assertCanRead(TEACHER_USER, examSchedule),
    ).rejects.toThrow('Anda tidak mengajar mapel ini di kelas ini')
  })

  it('lets exam-grading.manage-all write makeups of an exam', async () => {
    const scope = makeupScope([])

    await expect(
      scope.assertCanWrite(STAFF_USER, examSchedule),
    ).resolves.toBeUndefined()
  })

  it('lets exam-events.read read makeups of an exam but not write them', async () => {
    const scope = makeupScope([])
    const viewer = {
      id: 'viewer-1',
      roles: ['Kepala Madrasah'],
      permissions: ['exam-events.read'],
    }

    await expect(
      scope.assertCanRead(viewer, examSchedule),
    ).resolves.toBeUndefined()
    await expect(scope.assertCanWrite(viewer, examSchedule)).rejects.toThrow(
      ForbiddenException,
    )
  })
})
