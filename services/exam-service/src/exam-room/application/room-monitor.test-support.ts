import { randomUUID } from 'node:crypto'
import { IAuthorLookupPort } from '../../platform/author-lookup/author-lookup.port.js'
import type { IEmployeeIdentityReadPort } from '../../platform/employee-identity/employee-identity.port.js'
import type { ClassroomRef } from '../../platform/academic-lookup/academic-lookup.port.js'
import { FakeExamPackageRepository } from '../../exam-package/application/exam-package.repository.fake.js'
import {
  CLASSROOM_7A,
  FakeAcademicLookup,
  SEMESTER_ID,
} from '../../exam-schedule/application/exam-schedule.test-support.js'
import { FakeExamScheduleRepository } from '../../exam-schedule/application/exam-schedule.repository.fake.js'
import { FakeExamSessionRepository } from '../../exam-session/application/exam-session.repository.fake.js'
import { FakeStudentDirectory } from '../../exam-session/application/exam-session.test-support.js'
import type { ExamRoom } from '../domain/entities/exam-room.entity.js'
import type { ExamSchedule } from '../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type { ExamSession } from '../../exam-session/domain/entities/exam-session.entity.js'
import { FakeExamRoomRepository } from './exam-room.repository.fake.js'

export const MONITOR_NOW = new Date('2026-11-02T02:00:00.000Z')
export const SLOT_START = new Date('2026-11-02T01:30:00.000Z')
export const SLOT_END = new Date('2026-11-02T03:00:00.000Z')
export const LATER_SLOT_START = new Date('2026-11-02T06:00:00.000Z')
export const LATER_SLOT_END = new Date('2026-11-02T07:00:00.000Z')
export const SUPERVISOR_ID = 'sup-1'
export const TECHNICIAN_ID = 'tech-1'
export const OTHER_SUPERVISOR_ID = 'sup-2'
export const FOREIGN_SUPERVISOR_ID = 'sup-3'
export const FOREIGN_STUDENT_ID = '99999999-9999-4999-8999-999999999999'

export const CLASSROOM_8A: ClassroomRef = {
  id: '88888888-8888-4888-8888-888888888888',
  gradeId: CLASSROOM_7A.gradeId,
  academicYearId: CLASSROOM_7A.academicYearId,
  name: 'VIII A',
}

export class FakeAuthorLookup extends IAuthorLookupPort {
  constructor(private readonly names: Record<string, string> = {}) {
    super()
  }

  namesOf(employeeIds: string[]) {
    return Promise.resolve(
      new Map(
        employeeIds
          .filter((id) => this.names[id] !== undefined)
          .map((id) => [id, this.names[id]]),
      ),
    )
  }
}

export const fakeEmployees: IEmployeeIdentityReadPort = {
  findEmployeeIdByUserId: (userId) =>
    Promise.resolve(userId === SUPERVISOR_ID ? 'emp-1' : null),
  employeeExists: () => Promise.resolve(true),
}

export interface MonitorFixture {
  rooms: FakeExamRoomRepository
  schedules: FakeExamScheduleRepository
  sessions: FakeExamSessionRepository
  packages: FakeExamPackageRepository
  students: FakeStudentDirectory
  academic: FakeAcademicLookup
  authors: FakeAuthorLookup
  employees: IEmployeeIdentityReadPort
  eventId: string
  room: ExamRoom
  otherRoom: ExamRoom
  schedule: ExamSchedule
  scheduleByClassroom: Map<string, ExamSchedule>
  foreignSchedule: ExamSchedule
  slotId: string
  laterSlotId: string
  foreignSlotId: string
  studentIds: string[]
}

export async function seedMonitorRoom(
  studentCount = 120,
  roomsPerClass = 3,
): Promise<MonitorFixture> {
  const rooms = new FakeExamRoomRepository()
  const packages = new FakeExamPackageRepository()
  const schedules = new FakeExamScheduleRepository(packages)
  const sessions = new FakeExamSessionRepository()
  const event = await rooms.createEvent({
    semesterId: SEMESTER_ID,
    name: 'UAS Ganjil',
    type: 'FINAL',
    startsAt: SLOT_START,
    endsAt: SLOT_END,
    createdById: 'admin-1',
  })
  await rooms.updateEvent(event.id, { status: 'ACTIVE' })
  const room = await rooms.createRoom({
    eventId: event.id,
    code: 'R01',
    name: 'Ruang 01',
    capacity: studentCount,
    technicianUserId: TECHNICIAN_ID,
  })
  const otherRoom = await rooms.createRoom({
    eventId: event.id,
    code: 'R02',
    name: 'Ruang 02',
    capacity: 30,
  })
  const slot = await rooms.assignSupervisor({
    roomId: room.id,
    startsAt: SLOT_START,
    endsAt: SLOT_END,
    scheduledUserId: SUPERVISOR_ID,
  })
  const laterSlot = await rooms.assignSupervisor({
    roomId: room.id,
    startsAt: LATER_SLOT_START,
    endsAt: LATER_SLOT_END,
    scheduledUserId: SUPERVISOR_ID,
  })

  const foreignSlot = await rooms.assignSupervisor({
    roomId: room.id,
    startsAt: SLOT_START,
    endsAt: SLOT_END,
    scheduledUserId: FOREIGN_SUPERVISOR_ID,
  })

  const pkg = await packages.create({
    title: 'UAS Matematika',
    subjectId: CLASSROOM_7A.id,
    gradeId: CLASSROOM_7A.gradeId,
    createdById: 'admin-1',
    items: Array.from({ length: 40 }, () => ({
      questionId: randomUUID(),
      questionVersion: 1,
      position: 1,
    })),
  })
  const schedule7A = await schedules.createAndLockPackage({
    packageId: pkg.id,
    classroomId: CLASSROOM_7A.id,
    semesterId: SEMESTER_ID,
    eventId: event.id,
    startsAt: SLOT_START,
    endsAt: SLOT_END,
    durationMinutes: 90,
    type: 'FINAL',
    createdById: 'admin-1',
  })
  if (schedule7A === null) throw new Error('schedule not created')
  const schedule8A = await schedules.createAndLockPackage({
    packageId: pkg.id,
    classroomId: CLASSROOM_8A.id,
    semesterId: SEMESTER_ID,
    eventId: event.id,
    startsAt: SLOT_START,
    endsAt: SLOT_END,
    durationMinutes: 90,
    type: 'FINAL',
    createdById: 'admin-1',
  })
  if (schedule8A === null) throw new Error('schedule not created')
  const foreignSchedule = await schedules.createAndLockPackage({
    packageId: pkg.id,
    classroomId: CLASSROOM_7A.id,
    semesterId: SEMESTER_ID,
    eventId: event.id,
    startsAt: new Date('2026-11-03T01:30:00.000Z'),
    endsAt: new Date('2026-11-03T03:00:00.000Z'),
    durationMinutes: 90,
    type: 'FINAL',
    createdById: 'admin-1',
  })
  if (foreignSchedule === null) throw new Error('schedule not created')
  const schedule = schedule7A

  const studentIds: string[] = []
  for (let index = 0; index < studentCount; index += 1) {
    const studentId = randomUUID()
    studentIds.push(studentId)
    const classroom = index % roomsPerClass === 0 ? CLASSROOM_7A : CLASSROOM_8A
    await rooms.assignSeat({
      roomId: room.id,
      eventId: event.id,
      studentId,
      classroomId: classroom.id,
      seatNumber: index + 1,
    })
  }

  await rooms.assignSeat({
    roomId: otherRoom.id,
    eventId: event.id,
    studentId: FOREIGN_STUDENT_ID,
    classroomId: CLASSROOM_7A.id,
    seatNumber: 1,
  })

  const students = new FakeStudentDirectory(
    studentIds.map((id, index) => ({
      id,
      nis: `2024${String(index + 1).padStart(3, '0')}`,
      name: `Siswa ${index + 1}`,
    })),
  )
  return {
    rooms,
    schedules,
    sessions,
    packages,
    students,
    academic: new FakeAcademicLookup({
      classrooms: [CLASSROOM_7A, CLASSROOM_8A],
    }),
    authors: new FakeAuthorLookup({ 'emp-1': 'Ustadz Ahmad' }),
    employees: fakeEmployees,
    eventId: event.id,
    room,
    otherRoom,
    schedule,
    scheduleByClassroom: new Map([
      [CLASSROOM_7A.id, schedule7A],
      [CLASSROOM_8A.id, schedule8A],
    ]),
    foreignSchedule,
    slotId: slot.id,
    laterSlotId: laterSlot.id,
    foreignSlotId: foreignSlot.id,
    studentIds,
  }
}

export function scheduleOf(
  fixture: MonitorFixture,
  studentId: string,
): ExamSchedule {
  const index = fixture.studentIds.indexOf(studentId)
  const classroomId = index % 3 === 0 ? CLASSROOM_7A.id : CLASSROOM_8A.id
  const found = fixture.scheduleByClassroom.get(classroomId)
  if (found === undefined) throw new Error('schedule missing')
  return found
}

export function startSession(
  fixture: MonitorFixture,
  studentId: string,
  overrides: Partial<ExamSession> = {},
): ExamSession {
  const session: ExamSession = {
    id: randomUUID(),
    scheduleId: scheduleOf(fixture, studentId).id,
    studentId,
    userId: `user-${studentId}`,
    deviceId: 'device-1',
    enrollmentId: null,
    shuffleSeed: 'seed-1',
    startedAt: SLOT_START,
    deadline: SLOT_END,
    finalizeAt: SLOT_END,
    status: 'IN_PROGRESS',
    submittedAt: null,
    rawScore: null,
    maxScore: null,
    releasedAt: null,
    releasedById: null,
    gradedAt: null,
    violationCount: 0,
    lastSeenAt: MONITOR_NOW,
    absentSince: null,
    roomId: fixture.room.id,
    seatNumber: null,
    requiresTokenReentry: false,
    lockedByViolation: false,
    allowWebClient: false,
    allowLateEntry: false,
    extraMinutes: 0,
    kioskMode: 'PINNED',
    syncedAnswerCount: 10,
    unsyncedCount: 0,
    lastBatteryLevel: 80,
    isCharging: false,
    dndGranted: null,
    lockTaskActive: null,
    batteryUnrestricted: null,
    createdAt: SLOT_START,
    updatedAt: MONITOR_NOW,
    ...overrides,
  }
  fixture.sessions.sessions.set(session.id, session)
  return session
}
