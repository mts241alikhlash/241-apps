import { SchoolTimeService } from '@mts241alikhlash/nest-core/time'
import type { ConfigService } from '@nestjs/config'
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
import { FakeExamRoomRepository } from '../../../../exam-room/application/exam-room.repository.fake.js'
import {
  IEnrollmentLookupPort,
  type ActiveEnrollment,
} from '../../../../platform/enrollment-lookup/enrollment-lookup.port.js'
import type { IEmployeeIdentityReadPort } from '../../../../platform/employee-identity/employee-identity.port.js'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'
import { FakeExamActivityRepository } from '../../exam-activity.repository.fake.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { ListActivitiesUseCase } from '../list-activities/list-activities.use-case.js'
import { GetActivityReadinessUseCase } from './get-activity-readiness.use-case.js'

const CLASSROOM_7B = {
  id: '77777777-7777-4777-8777-777777777778',
  gradeId: CLASSROOM_7A.gradeId,
  academicYearId: YEAR_ID,
  name: 'VII B',
}
const STUDENTS: Record<string, string[]> = {
  [CLASSROOM_7A.id]: ['s1', 's2'],
  [CLASSROOM_7B.id]: ['s3'],
}
const STARTS = new Date('2026-11-10T01:00:00Z')

class FakeRoster extends IEnrollmentLookupPort {
  findActiveByStudent() {
    return Promise.resolve(null)
  }

  listActiveByClassroom(classroomId: string, semesterId: string) {
    return Promise.resolve(
      (STUDENTS[classroomId] ?? []).map((studentId): ActiveEnrollment => ({
        id: `enr-${studentId}`,
        studentId,
        classroomId,
        semesterId,
      })),
    )
  }
}

class FakeNumbers extends IParticipantNumberPort {
  missing = new Set<string>()
  failure: Error | null = null

  findNumber() {
    return Promise.resolve(null)
  }

  findNumbers(studentIds: string[]) {
    if (this.failure) return Promise.reject(this.failure)
    return Promise.resolve(
      new Map(
        studentIds
          .filter((id) => !this.missing.has(id))
          .map((id) => [id, `P-${id}`]),
      ),
    )
  }

  issueNumbers() {
    return Promise.resolve({ issued: 0, skipped: [] })
  }
}

const employees = {
  findEmployeeIdByUserId: () => Promise.resolve('emp-1'),
  employeeExists: () => Promise.resolve(true),
} as IEmployeeIdentityReadPort

function activityRow(
  id: string,
  eventId: string | null,
  overrides: Partial<ExamActivity> = {},
): ExamActivity {
  return {
    id,
    semesterId: SEMESTER_ID,
    eventId,
    gradeId: CLASSROOM_7A.gradeId,
    subjectId: 'subject-inf',
    packageId: 'package-1',
    type: 'MIDTERM',
    tokenMode: 'ROTATING',
    tokenRotation: 0,
    presetId: 'preset-1',
    policy: { ...DEFAULT_POLICIES.MIDTERM },
    startsAt: STARTS,
    endsAt: new Date(STARTS.getTime() + 90 * 60_000),
    durationMinutes: 90,
    status: 'SCHEDULED',
    deliveryMode: 'ONLINE',
    offlineKind: null,
    maxScore: 100,
    autoStatus: true,
    createdById: 'admin-1',
    ...overrides,
  }
}

async function setup(
  options: { assignments?: { subjectId: string; classroomId: string }[] } = {},
) {
  const activities = new FakeExamActivityRepository()
  const rooms = new FakeExamRoomRepository()
  const numbers = new FakeNumbers()
  const academic = new FakeAcademicLookup({
    semesterId: SEMESTER_ID,
    classrooms: [CLASSROOM_7A, CLASSROOM_7B],
    subjects: [{ id: 'subject-inf', name: 'Informatika' }],
    assignments: options.assignments,
  })
  const scope = new ScheduleScopeService(employees, academic)
  const event = await rooms.createEvent({
    semesterId: SEMESTER_ID,
    name: 'PTS',
    type: 'MIDTERM',
    startsAt: STARTS,
    endsAt: new Date(STARTS.getTime() + 86_400_000),
    createdById: 'admin-1',
  })
  const room = await rooms.createRoom({
    eventId: event.id,
    code: 'R1',
    name: 'Ruang 1',
    capacity: 40,
    technicianUserId: 'tech-1',
  })
  const seat = (studentId: string, classroomId: string, seatNumber: number) =>
    rooms.assignSeat({
      roomId: room.id,
      eventId: event.id,
      studentId,
      classroomId,
      seatNumber,
    })
  await seat('s1', CLASSROOM_7A.id, 1)
  await seat('s2', CLASSROOM_7A.id, 2)
  await seat('s3', CLASSROOM_7B.id, 3)
  const slot = await rooms.assignSupervisor({
    roomId: room.id,
    startsAt: new Date(STARTS.getTime() - 3_600_000),
    endsAt: new Date(STARTS.getTime() + 3_600_000),
    scheduledUserId: 'sup-1',
  })
  const act = activityRow('a-1', event.id)
  activities.activities.set(act.id, act)
  activities.activitySchedules.set(
    act.id,
    [CLASSROOM_7A, CLASSROOM_7B].map((room) => ({
      id: `sched-${room.id}`,
      classroomId: room.id,
      startsAt: act.startsAt,
      endsAt: act.endsAt,
    })),
  )
  const useCase = new GetActivityReadinessUseCase(
    new ListActivitiesUseCase(activities, academic, scope),
    activities,
    academic,
    rooms,
    new FakeRoster(),
    numbers,
    new SchoolTimeService({
      getOrThrow: () => 'Asia/Jakarta',
    } as unknown as ConfigService),
  )
  return { activities, rooms, numbers, room, event, slot, act, useCase }
}

const check = (
  rows: Awaited<ReturnType<GetActivityReadinessUseCase['execute']>>,
  key: string,
) => rows[0].checks.find((item) => item.key === key)

describe('GetActivityReadinessUseCase', () => {
  it('reports every check ok for a fully prepared online activity', async () => {
    const { useCase, event } = await setup()

    const rows = await useCase.execute(SCHEDULE_ADMIN_USER, {
      eventId: event.id,
      date: '2026-11-10',
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      activityId: 'a-1',
      subjectName: 'Informatika',
      deliveryMode: 'ONLINE',
      startsAt: STARTS,
    })
    expect(rows[0].checks.map((item) => item.key)).toEqual([
      'PACKAGE',
      'SCHEDULES',
      'SEATS',
      'NUMBERS',
      'SUPERVISORS',
      'TECHNICIANS',
      'LATE_TOLERANCE',
    ])
    expect(rows[0].checks.every((item) => item.ok)).toBe(true)
  })

  it('flags a missing package and an unapproved package', async () => {
    const { useCase, activities, act } = await setup()
    activities.activities.set(act.id, { ...act, packageId: null })
    const none = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })
    expect(check(none, 'PACKAGE')).toEqual({
      key: 'PACKAGE',
      ok: false,
      detail: 'Paket soal belum dipasang',
    })

    activities.activities.set(act.id, act)
    activities.packageStatuses.set('package-1', 'DRAFT')
    const draft = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })
    expect(check(draft, 'PACKAGE')).toMatchObject({
      ok: false,
      detail: 'Paket belum disetujui',
    })

    activities.packageStatuses.set('package-1', 'LOCKED')
    const locked = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })
    expect(check(locked, 'PACKAGE')?.ok).toBe(true)
  })

  it('omits the package check for an offline activity', async () => {
    const { useCase, activities, act } = await setup()
    activities.activities.set(act.id, {
      ...act,
      deliveryMode: 'OFFLINE',
      offlineKind: 'WRITTEN',
      packageId: null,
    })

    const rows = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })

    expect(check(rows, 'PACKAGE')).toBeUndefined()
    expect(rows[0].checks).toHaveLength(6)
  })

  it('counts the classrooms without a schedule', async () => {
    const { useCase, activities, act } = await setup()
    activities.activitySchedules.set(act.id, [
      {
        id: 's',
        classroomId: CLASSROOM_7A.id,
        startsAt: act.startsAt,
        endsAt: act.endsAt,
      },
    ])

    const rows = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })

    expect(check(rows, 'SCHEDULES')).toEqual({
      key: 'SCHEDULES',
      ok: false,
      detail: '1 kelas belum punya jadwal',
    })
  })

  it('counts the students without a seat', async () => {
    const { useCase, rooms } = await setup()
    const seat = [...rooms.seats.values()].find((row) => row.studentId === 's3')
    rooms.seats.delete(seat!.id)

    const rows = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })

    expect(check(rows, 'SEATS')).toEqual({
      key: 'SEATS',
      ok: false,
      detail: '1 siswa belum punya kursi',
    })
  })

  it('omits the room checks for an activity without an event', async () => {
    const { useCase, activities, act } = await setup()
    activities.activities.set(act.id, { ...act, eventId: null })

    const rows = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })

    expect(rows[0].checks.map((item) => item.key)).toEqual([
      'PACKAGE',
      'SCHEDULES',
      'LATE_TOLERANCE',
    ])
  })

  it('counts seated students without a participant number', async () => {
    const { useCase, numbers } = await setup()
    numbers.missing.add('s1')

    const rows = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })

    expect(check(rows, 'NUMBERS')).toEqual({
      key: 'NUMBERS',
      ok: false,
      detail: '1 siswa belum punya nomor peserta',
    })
  })

  it('fails the numbers check when the number port is down', async () => {
    const { useCase, numbers } = await setup()
    numbers.failure = new Error('down')

    const rows = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })

    expect(check(rows, 'NUMBERS')).toEqual({
      key: 'NUMBERS',
      ok: false,
      detail: 'Nomor peserta tidak dapat dimuat',
    })
  })

  it('lists the rooms without a supervisor covering the start', async () => {
    const { useCase, rooms, slot } = await setup()
    rooms.supervisors.set(slot.id, {
      ...slot,
      startsAt: new Date(STARTS.getTime() + 3_600_000),
      endsAt: new Date(STARTS.getTime() + 7_200_000),
    })

    const rows = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })

    expect(check(rows, 'SUPERVISORS')).toEqual({
      key: 'SUPERVISORS',
      ok: false,
      detail: 'Ruang tanpa pengawas: Ruang 1',
    })
  })

  it('lists the rooms without a technician', async () => {
    const { useCase, rooms, room } = await setup()
    rooms.rooms.set(room.id, { ...room, technicianUserId: null })

    const rows = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })

    expect(check(rows, 'TECHNICIANS')).toEqual({
      key: 'TECHNICIANS',
      ok: false,
      detail: 'Ruang tanpa teknisi: Ruang 1',
    })
  })

  it('reports the default and a custom late tolerance as ok', async () => {
    const { useCase, activities, act } = await setup()
    const standard = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })
    expect(check(standard, 'LATE_TOLERANCE')).toEqual({
      key: 'LATE_TOLERANCE',
      ok: true,
      detail: 'Toleransi terlambat 15 menit',
    })

    activities.activities.set(act.id, {
      ...act,
      policy: { ...act.policy, lateToleranceMinutes: 30 },
    })
    const custom = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })
    expect(check(custom, 'LATE_TOLERANCE')?.detail).toBe(
      'Toleransi terlambat 30 menit',
    )
  })

  it('splits days at midnight in Asia/Jakarta', async () => {
    const { useCase, activities, event } = await setup()
    activities.activities.clear()
    for (const [id, at] of [
      ['at-midnight', '2026-11-09T17:00:00Z'],
      ['late-evening', '2026-11-10T16:30:00Z'],
      ['next-day', '2026-11-10T17:00:00Z'],
    ] as const) {
      activities.activities.set(
        id,
        activityRow(id, event.id, { startsAt: new Date(at) }),
      )
    }

    const tenth = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })
    const eleventh = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-11',
    })

    expect(tenth.map((row) => row.activityId)).toEqual([
      'at-midnight',
      'late-evening',
    ])
    expect(eleventh.map((row) => row.activityId)).toEqual(['next-day'])
  })

  it('filters by event when one is given', async () => {
    const { useCase, activities, event } = await setup()
    activities.activities.set('other', activityRow('other', 'other-event'))

    const scoped = await useCase.execute(SCHEDULE_ADMIN_USER, {
      eventId: event.id,
      date: '2026-11-10',
    })
    const all = await useCase.execute(SCHEDULE_ADMIN_USER, {
      date: '2026-11-10',
    })

    expect(scoped.map((row) => row.activityId)).toEqual(['a-1'])
    expect(all.map((row) => row.activityId).sort()).toEqual(['a-1', 'other'])
  })

  it('shows a teacher only the activities the scope permits', async () => {
    const { useCase, activities } = await setup({
      assignments: [{ subjectId: 'subject-inf', classroomId: 'none' }],
    })
    activities.activities.set(
      'daily',
      activityRow('daily', null, {
        type: 'DAILY',
        policy: { ...DEFAULT_POLICIES.DAILY },
        createdById: 'teacher-1',
      }),
    )
    const teacher: ScheduleAccessUser = {
      id: 'teacher-1',
      roles: ['TEACHER'],
      permissions: ['exam-schedules.read', 'exam-schedules.manage'],
    }

    const rows = await useCase.execute(teacher, { date: '2026-11-10' })

    expect(rows.map((row) => row.activityId)).toEqual(['daily'])
  })

  it('returns an empty list when nothing falls on the day', async () => {
    const { useCase } = await setup()

    await expect(
      useCase.execute(SCHEDULE_ADMIN_USER, { date: '2026-12-01' }),
    ).resolves.toEqual([])
  })
})
