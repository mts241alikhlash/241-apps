import { FakeExamActivityRepository } from '../../exam-activity/application/exam-activity.repository.fake.js'
import type { ExamActivity } from '../../exam-activity/domain/entities/exam-activity.entity.js'
import { DEFAULT_POLICIES } from '../../exam-activity/domain/policies/exam-policy.policy.js'
import { GradingScopeService } from '../../exam-grading/application/grading-scope.service.js'
import { FakeExamPackageRepository } from '../../exam-package/application/exam-package.repository.fake.js'
import { SUBJECT_ID } from '../../exam-package/application/exam-package.test-support.js'
import { FakeExamRoomRepository } from '../../exam-room/application/exam-room.repository.fake.js'
import { FakeExamScheduleRepository } from '../../exam-schedule/application/exam-schedule.repository.fake.js'
import {
  CLASSROOM_7A,
  FakeAcademicLookup,
  SEMESTER_ID,
  YEAR_ID,
} from '../../exam-schedule/application/exam-schedule.test-support.js'
import type { ExamSchedule } from '../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { FakeStudentDirectory } from '../../exam-session/application/exam-session.test-support.js'
import type { IEmployeeIdentityReadPort } from '../../platform/employee-identity/employee-identity.port.js'
import { IParticipantNumberPort } from '../../platform/participant-number/participant-number.port.js'
import { FakeOfflineResultRepository } from './offline-result.repository.fake.js'
import { OfflineRosterReader } from './offline-roster.reader.js'

export {
  STAFF,
  TEACHER,
} from '../../exam-grading/application/exam-grading.test-support.js'
export { SUBJECT_ID, CLASSROOM_7A, SEMESTER_ID }

export const OTHER_SUBJECT = '33333333-3333-4333-8333-333333333333'
export const CLASSROOM_7B = {
  id: '77777777-7777-4777-8777-777777777778',
  gradeId: CLASSROOM_7A.gradeId,
  academicYearId: YEAR_ID,
  name: 'VII B',
}
export const EVENT_ID = '44444444-4444-4444-8444-444444444444'
export const ACTIVITY_ID = '55555555-5555-4555-8555-555555555555'
export const SCHEDULE_ID = '66666666-6666-4666-8666-666666666666'
export const STUDENTS = {
  budi: 'a0000000-0000-4000-8000-000000000001',
  ani: 'a0000000-0000-4000-8000-000000000002',
  citra: 'a0000000-0000-4000-8000-000000000003',
  dodi: 'a0000000-0000-4000-8000-000000000004',
}
export const NUMBERS: Record<string, string> = {
  [STUDENTS.budi]: '7-002',
  [STUDENTS.ani]: '7-001',
  [STUDENTS.citra]: '7-003',
}
export const NOW = new Date('2026-11-27T05:00:00.000Z')

export class FakeNumbers extends IParticipantNumberPort {
  failure: Error | null = null

  findNumber() {
    return Promise.resolve(null)
  }

  findNumbers(studentIds: string[]) {
    if (this.failure) return Promise.reject(this.failure)
    return Promise.resolve(
      new Map(
        studentIds
          .filter((id) => NUMBERS[id] !== undefined)
          .map((id) => [id, NUMBERS[id]]),
      ),
    )
  }

  issueNumbers() {
    return Promise.resolve({ issued: 0, skipped: [] })
  }
}

export function offlineActivity(
  overrides: Partial<ExamActivity> = {},
): ExamActivity {
  return {
    id: ACTIVITY_ID,
    semesterId: SEMESTER_ID,
    eventId: EVENT_ID,
    gradeId: CLASSROOM_7A.gradeId,
    subjectId: SUBJECT_ID,
    packageId: null,
    type: 'FINAL',
    tokenMode: 'STATIC',
    tokenRotation: 0,
    presetId: null,
    policy: { ...DEFAULT_POLICIES.FINAL },
    startsAt: new Date('2026-11-27T01:00:00.000Z'),
    endsAt: new Date('2026-11-27T02:30:00.000Z'),
    durationMinutes: 90,
    status: 'ACTIVE',
    deliveryMode: 'OFFLINE',
    offlineKind: 'WRITTEN',
    maxScore: 50,
    autoStatus: true,
    createdById: 'creator',
    ...overrides,
  }
}

export function offlineSchedule(
  overrides: Partial<ExamSchedule> = {},
): ExamSchedule {
  return {
    id: SCHEDULE_ID,
    deliveryMode: 'OFFLINE',
    packageId: null,
    packageTitle: null,
    subjectId: SUBJECT_ID,
    classroomId: CLASSROOM_7A.id,
    semesterId: SEMESTER_ID,
    eventId: EVENT_ID,
    startsAt: new Date('2026-11-27T01:00:00.000Z'),
    endsAt: new Date('2026-11-27T02:30:00.000Z'),
    durationMinutes: 90,
    type: 'FINAL',
    kind: 'REGULAR',
    makeupOfId: null,
    tokenRotation: 0,
    activityId: ACTIVITY_ID,
    minSubmitMinutes: 0,
    status: 'SCHEDULED',
    createdById: 'creator',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function buildOffline(
  options: { taught?: { subjectId: string; classroomId: string }[] } = {},
) {
  const schedules = new FakeExamScheduleRepository(
    new FakeExamPackageRepository(),
  )
  const activities = new FakeExamActivityRepository()
  const rooms = new FakeExamRoomRepository()
  const results = new FakeOfflineResultRepository()
  const academic = new FakeAcademicLookup({
    classrooms: [CLASSROOM_7A, CLASSROOM_7B],
    subjects: [
      { id: SUBJECT_ID, name: 'Tafsir' },
      { id: OTHER_SUBJECT, name: 'Prakarya' },
    ],
    assignments: options.taught ?? [
      { subjectId: SUBJECT_ID, classroomId: CLASSROOM_7A.id },
    ],
  })
  const employees = {
    findEmployeeIdByUserId: () => Promise.resolve('emp-1'),
    employeeExists: () => Promise.resolve(true),
  } as IEmployeeIdentityReadPort
  const scope = new GradingScopeService(employees, academic)
  const students = new FakeStudentDirectory([
    { id: STUDENTS.budi, nis: '1', name: 'Budi' },
    { id: STUDENTS.ani, nis: '2', name: 'Ani' },
    { id: STUDENTS.citra, nis: '3', name: 'Citra' },
    { id: STUDENTS.dodi, nis: '4', name: 'Dodi' },
  ])
  const numbers = new FakeNumbers()
  activities.activities.set(ACTIVITY_ID, offlineActivity())
  schedules.schedules.set(SCHEDULE_ID, offlineSchedule())
  let seat = 0
  const seatStudent = (studentId: string, classroomId = CLASSROOM_7A.id) => {
    seat += 1
    rooms.seats.set(`seat-${seat}`, {
      id: `seat-${seat}`,
      roomId: 'room-1',
      eventId: EVENT_ID,
      studentId,
      classroomId,
      seatNumber: seat,
      allowLateEntry: false,
      createdAt: NOW,
    })
  }
  const markAbsent = (studentId: string, scheduleId = SCHEDULE_ID) => {
    rooms.absences.set(`abs-${studentId}-${scheduleId}`, {
      id: `abs-${studentId}-${scheduleId}`,
      reportId: 'report-1',
      studentId,
      scheduleId,
      reason: 'SICK',
      note: null,
      recordedBy: 'sup-1',
      updatedAt: NOW,
    })
  }
  const reader = new OfflineRosterReader(
    scope,
    schedules,
    activities,
    rooms,
    results,
    students,
    numbers,
  )
  return {
    schedules,
    activities,
    rooms,
    results,
    academic,
    scope,
    students,
    numbers,
    reader,
    seatStudent,
    markAbsent,
  }
}

export type OfflineWorld = ReturnType<typeof buildOffline>

export function seatAll(world: OfflineWorld): void {
  world.seatStudent(STUDENTS.budi)
  world.seatStudent(STUDENTS.ani)
  world.seatStudent(STUDENTS.citra)
  world.seatStudent(STUDENTS.dodi, CLASSROOM_7B.id)
}
