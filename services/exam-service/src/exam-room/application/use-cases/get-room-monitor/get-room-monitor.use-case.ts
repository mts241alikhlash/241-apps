import { SchoolTimeService } from '@mts241alikhlash/nest-core/time'
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { IAuthorLookupPort } from '../../../../platform/author-lookup/author-lookup.port.js'
import { IEmployeeIdentityReadPort } from '../../../../platform/employee-identity/employee-identity.port.js'
import { IStudentDirectoryPort } from '../../../../platform/student-directory/student-directory.port.js'
import { IExamPackageRepository } from '../../../../exam-package/domain/repositories/exam-package.repository.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import type { ExamRoom } from '../../../domain/entities/exam-room.entity.js'
import type { ExamRoomSeat } from '../../../domain/entities/exam-room-seat.entity.js'
import type { ExamRoomSupervisor } from '../../../domain/entities/exam-room-supervisor.entity.js'
import type { ExamRoomReportAbsence } from '../../../domain/entities/exam-room-report.entity.js'
import type { ExamSession } from '../../../../exam-session/domain/entities/exam-session.entity.js'
import type { ExamSchedule } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { IExamSessionRepository } from '../../../../exam-session/domain/repositories/exam-session.repository.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'
import { RoomAccessCodeService } from '../../room-access-code.service.js'
import {
  RoomAccessService,
  type RoomStaffUser,
} from '../../room-access.service.js'
import { MANAGE_ALL, SUPERVISE, TECHNICIAN } from '../../room-access.service.js'
import { staffNames } from '../../room-staff-names.js'

export const MONITOR_STATUSES = [
  'ALL',
  'NOT_STARTED',
  'IN_PROGRESS',
  'LOCKED',
  'SUBMITTED',
  'ABSENT',
] as const

export type MonitorStatus = (typeof MONITOR_STATUSES)[number]

export const MONITOR_STALE_MS = 45_000
export const MONITOR_MIN_LIMIT = 5
export const MONITOR_MAX_LIMIT = 100
export const MONITOR_DEFAULT_LIMIT = 25

export interface RoomMonitorQuery {
  page?: number
  limit?: number
  search?: string
  status?: MonitorStatus
  classroomId?: string
  slotId?: string
}

export interface RoomMonitorSummary {
  totalRegistered: number
  notStartedCount: number
  inProgressCount: number
  offlineOrUnsyncedCount: number
  lockedOrViolationCount: number
  finishedCount: number
  absentMarkedCount: number
}

export interface RoomMonitorSession {
  sessionId: string
  status: ExamSession['status']
  startedAt: string
  deadline: string
  submittedAt: string | null
  extraMinutes: number
  answeredCount: number
  syncedAnswerCount: number
  unsyncedCount: number
  lastSeenAt: string | null
  batteryLevel: number | null
  isCharging: boolean | null
  kioskMode: string
  allowWebClient: boolean
  violationCount: number
  lockedByViolation: boolean
  requiresTokenReentry: boolean
  lastEvent: { type: string; occurredAt: string; detail: string | null } | null
  lastSnapshotAt: string | null
  cameraBlocked: string | null
  latestSnapshotUrl: string | null
}

export interface RoomMonitorParticipant {
  seatNumber: number
  studentId: string
  studentName: string | null
  nis: string | null
  classroomName: string | null
  subjectName: string | null
  packageTitle: string
  scheduleId: string
  totalQuestions: number
  session: RoomMonitorSession | null
  absence: { reason: string; note: string | null } | null
}

export interface RoomMonitorMeta {
  page: number
  limit: number
  total: number
  serverTime: string
  room: {
    id: string
    code: string
    name: string
    capacity: number
    technicianName: string | null
    currentSupervisorName: string | null
    scheduledSupervisorName: string | null
    isSubstituted: boolean
  }
  token: { accessCode: string; expiresAt: string; rotation: number } | null
  summary: RoomMonitorSummary
}

export interface RoomMonitorResult {
  data: RoomMonitorParticipant[]
  meta: RoomMonitorMeta
}

interface RosterRow {
  seat: ExamRoomSeat
  scheduleId: string
  packageTitle: string
  subjectName: string | null
  totalQuestions: number
  session: ExamSession | null
  absence: ExamRoomReportAbsence | null
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return MONITOR_DEFAULT_LIMIT
  return Math.min(MONITOR_MAX_LIMIT, Math.max(MONITOR_MIN_LIMIT, limit))
}

function isOfflineOrUnsynced(session: ExamSession, now: Date): boolean {
  if (session.status !== 'IN_PROGRESS') return false
  if (session.unsyncedCount > 0) return true
  if (session.lastSeenAt === null) return true
  return now.getTime() - session.lastSeenAt.getTime() > MONITOR_STALE_MS
}

function matchesStatus(row: RosterRow, status: MonitorStatus): boolean {
  if (status === 'ALL') return true
  if (status === 'NOT_STARTED') return row.session === null
  if (status === 'ABSENT') return row.absence !== null
  if (status === 'LOCKED') {
    return (
      row.session !== null &&
      (row.session.lockedByViolation || row.session.requiresTokenReentry)
    )
  }
  if (status === 'IN_PROGRESS') {
    return row.session !== null && row.session.status === 'IN_PROGRESS'
  }
  return row.session !== null && row.session.status !== 'IN_PROGRESS'
}

@Injectable()
export class GetRoomMonitorUseCase {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly sessions: IExamSessionRepository,
    private readonly schedules: IExamScheduleRepository,
    private readonly packages: IExamPackageRepository,
    private readonly students: IStudentDirectoryPort,
    private readonly academic: IAcademicLookupPort,
    private readonly authors: IAuthorLookupPort,
    private readonly employees: IEmployeeIdentityReadPort,
    private readonly access: RoomAccessService,
    private readonly roomCodes: RoomAccessCodeService,
    private readonly schoolTime: SchoolTimeService,
  ) {}

  async execute(
    user: RoomStaffUser,
    roomId: string,
    query: RoomMonitorQuery,
    now: Date = new Date(),
  ): Promise<RoomMonitorResult> {
    const room = await this.access.assertCanView(user, roomId)
    const slot = await this.resolveSlot(user, room, query.slotId, now)
    const seats = await this.rooms.listSeatsByRoom(roomId)
    const schedules = await this.roomSchedules(room.eventId, slot, now)
    const sessions = await this.sessions.listByRoom(roomId)
    const sessionOf = new Map(
      sessions.map((session) => [
        `${session.scheduleId}:${session.studentId}`,
        session,
      ]),
    )
    const absences = await this.reportAbsences(roomId, slot)
    const refs = new Map(
      (await this.students.refsByIds(seats.map((seat) => seat.studentId))).map(
        (ref) => [ref.id, ref],
      ),
    )
    const classroomNames = new Map(
      (
        await this.academic.classroomsByIds([
          ...new Set(seats.map((seat) => seat.classroomId)),
        ])
      ).map((row) => [row.id, row.name]),
    )
    const subjectNames = new Map(
      (
        await this.academic.subjectsByIds([
          ...new Set(schedules.map((row) => row.subjectId)),
        ])
      ).map((row) => [row.id, row.name]),
    )
    const questionCounts = await this.questionCounts(
      schedules.map((row) => row.packageId),
    )
    const schedulesOfClassroom = new Map<string, ExamSchedule[]>()
    for (const schedule of schedules) {
      const held = schedulesOfClassroom.get(schedule.classroomId) ?? []
      held.push(schedule)
      schedulesOfClassroom.set(schedule.classroomId, held)
    }

    const roster: RosterRow[] = seats
      .map((seat) => {
        const candidates = schedulesOfClassroom.get(seat.classroomId) ?? []
        const sitting = candidates.find((row) =>
          sessionOf.has(`${row.id}:${seat.studentId}`),
        )
        const schedule = sitting ?? candidates[0]
        const session =
          schedule === undefined
            ? null
            : (sessionOf.get(`${schedule.id}:${seat.studentId}`) ?? null)
        return {
          seat,
          scheduleId: session?.scheduleId ?? schedule?.id ?? '',
          packageTitle: schedule?.packageTitle ?? '',
          subjectName:
            schedule === undefined
              ? null
              : (subjectNames.get(schedule.subjectId) ?? null),
          totalQuestions:
            schedule === undefined
              ? 0
              : (questionCounts.get(schedule.packageId) ?? 0),
          session,
          absence:
            session !== null
              ? null
              : (absences.find(
                  (row) =>
                    row.studentId === seat.studentId &&
                    row.scheduleId === schedule?.id,
                ) ?? null),
        }
      })
      .sort((a, b) => a.seat.seatNumber - b.seat.seatNumber)

    const summary = this.summarise(roster, now)
    const filtered = roster.filter(
      (row) =>
        matchesStatus(row, query.status ?? 'ALL') &&
        (query.classroomId === undefined ||
          row.seat.classroomId === query.classroomId) &&
        this.matchesSearch(query.search, refs.get(row.seat.studentId)),
    )
    const page = Math.max(1, query.page ?? 1)
    const limit = clampLimit(query.limit)
    const slice = filtered.slice((page - 1) * limit, page * limit)
    const events = await this.latestEvents(
      slice
        .map((row) => row.session?.id)
        .filter((id): id is string => id !== undefined),
    )
    const names = await staffNames(this.authors, this.employees, {
      technicianUserId: room.technicianUserId,
      currentSupervisorUserId: slot?.actualUserId ?? null,
      scheduledSupervisorUserId: slot?.scheduledUserId ?? null,
    })

    return {
      data: slice.map((row) => {
        const ref = refs.get(row.seat.studentId)
        const event = row.session ? events.get(row.session.id) : undefined
        return {
          seatNumber: row.seat.seatNumber,
          studentId: row.seat.studentId,
          studentName: ref?.name ?? null,
          nis: ref?.nis ?? null,
          classroomName: classroomNames.get(row.seat.classroomId) ?? null,
          subjectName: row.subjectName,
          packageTitle: row.packageTitle,
          scheduleId: row.scheduleId,
          totalQuestions: row.totalQuestions,
          session:
            row.session === null
              ? null
              : {
                  sessionId: row.session.id,
                  status: row.session.status,
                  startedAt: row.session.startedAt.toISOString(),
                  deadline: row.session.deadline.toISOString(),
                  submittedAt: row.session.submittedAt?.toISOString() ?? null,
                  extraMinutes: row.session.extraMinutes,
                  answeredCount:
                    row.session.syncedAnswerCount + row.session.unsyncedCount,
                  syncedAnswerCount: row.session.syncedAnswerCount,
                  unsyncedCount: row.session.unsyncedCount,
                  lastSeenAt: row.session.lastSeenAt?.toISOString() ?? null,
                  batteryLevel: row.session.lastBatteryLevel,
                  isCharging: row.session.isCharging,
                  kioskMode: row.session.kioskMode,
                  allowWebClient: row.session.allowWebClient,
                  violationCount: row.session.violationCount,
                  lockedByViolation: row.session.lockedByViolation,
                  requiresTokenReentry: row.session.requiresTokenReentry,
                  lastEvent:
                    event === undefined
                      ? null
                      : {
                          type: event.type,
                          occurredAt: event.occurredAt.toISOString(),
                          detail: event.detail,
                        },
                  lastSnapshotAt:
                    row.session.lastSnapshotAt?.toISOString() ?? null,
                  cameraBlocked: row.session.cameraBlocked,
                  latestSnapshotUrl:
                    row.session.lastSnapshotAt === null
                      ? null
                      : `/exam-sessions/${row.session.id}/snapshots/latest`,
                },
          absence:
            row.absence === null
              ? null
              : { reason: row.absence.reason, note: row.absence.note },
        }
      }),
      meta: {
        page,
        limit,
        total: filtered.length,
        serverTime: now.toISOString(),
        room: {
          id: room.id,
          code: room.code,
          name: room.name,
          capacity: room.capacity,
          technicianName: names.technicianName,
          currentSupervisorName: names.currentSupervisorName,
          scheduledSupervisorName: names.scheduledSupervisorName,
          isSubstituted:
            slot !== null && slot.actualUserId !== slot.scheduledUserId,
        },
        token: this.tokenFor(user, room, now),
        summary,
      },
    }
  }

  private tokenFor(
    user: RoomStaffUser,
    room: { id: string; tokenRotation: number },
    now: Date,
  ): RoomMonitorMeta['token'] {
    const maySee =
      user.permissions?.includes(MANAGE_ALL) === true ||
      user.permissions?.includes(SUPERVISE) === true ||
      user.permissions?.includes(TECHNICIAN) === true
    if (!maySee) return null
    const derived = this.roomCodes.codeFor(room.id, room.tokenRotation, now)
    return {
      accessCode: derived.code,
      expiresAt: derived.expiresAt.toISOString(),
      rotation: room.tokenRotation,
    }
  }

  private summarise(roster: RosterRow[], now: Date): RoomMonitorSummary {
    let notStartedCount = 0
    let inProgressCount = 0
    let offlineOrUnsyncedCount = 0
    let lockedOrViolationCount = 0
    let finishedCount = 0
    let absentMarkedCount = 0
    for (const row of roster) {
      if (row.absence !== null) absentMarkedCount += 1
      if (row.session === null) {
        notStartedCount += 1
        continue
      }
      if (row.session.status === 'IN_PROGRESS') inProgressCount += 1
      else finishedCount += 1
      if (isOfflineOrUnsynced(row.session, now)) offlineOrUnsyncedCount += 1
      if (row.session.lockedByViolation || row.session.requiresTokenReentry) {
        lockedOrViolationCount += 1
      }
    }
    return {
      totalRegistered: roster.length,
      notStartedCount,
      inProgressCount,
      offlineOrUnsyncedCount,
      lockedOrViolationCount,
      finishedCount,
      absentMarkedCount,
    }
  }

  private matchesSearch(
    search: string | undefined,
    ref: { name: string | null; nis: string } | undefined,
  ): boolean {
    const needle = search?.trim().toLowerCase()
    if (needle === undefined || needle === '') return true
    return (
      (ref?.name ?? '').toLowerCase().includes(needle) ||
      (ref?.nis ?? '').includes(needle)
    )
  }

  private async resolveSlot(
    user: RoomStaffUser,
    room: ExamRoom,
    slotId: string | undefined,
    now: Date,
  ): Promise<ExamRoomSupervisor | null> {
    if (slotId !== undefined) {
      const slot = await this.rooms.findSupervisorById(slotId)
      if (slot?.roomId !== room.id) {
        throw new NotFoundException('Jadwal pengawasan tidak ditemukan')
      }
      await this.access.assertCanViewSlot(user, room.id, slot)
      return slot
    }
    const current = await this.rooms.findSupervisorAt(room.id, now)
    if (
      user.permissions?.includes(MANAGE_ALL) ||
      (user.permissions?.includes(TECHNICIAN) === true &&
        room.technicianUserId === user.id)
    ) {
      return current
    }
    const own = (await this.rooms.listSupervisors(room.id)).filter(
      (slot) =>
        slot.actualUserId === user.id || slot.scheduledUserId === user.id,
    )
    if (own.length === 0) {
      throw new ForbiddenException({
        code: 'ROOM_FORBIDDEN',
        message: 'Anda tidak berwenang pada ruangan ini',
      })
    }
    const onDuty = own.find((slot) => slot.id === current?.id)
    if (onDuty !== undefined) return onDuty
    return (
      own.find((slot) => slot.startsAt.getTime() > now.getTime()) ?? own.at(-1)!
    )
  }

  private roomSchedules(
    eventId: string,
    slot: ExamRoomSupervisor | null,
    now: Date,
  ) {
    if (slot !== null) {
      return this.schedules.listSchedulesForEventWindow(
        eventId,
        slot.startsAt,
        slot.endsAt,
      )
    }
    const { from: dayStart, to } = this.schoolTime.dayRange(
      this.schoolTime.today(now),
    )
    const dayEnd = new Date(to.getTime() + 1)
    return this.schedules.listSchedulesForEventWindow(eventId, dayStart, dayEnd)
  }

  private async reportAbsences(
    roomId: string,
    slot: ExamRoomSupervisor | null,
  ): Promise<ExamRoomReportAbsence[]> {
    if (slot === null) return []
    const report = await this.rooms.findReportBySlot(roomId, slot.id)
    if (report === null) return []
    return this.rooms.listAbsencesByReport(report.id)
  }

  private async questionCounts(
    packageIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>()
    for (const id of [...new Set(packageIds)]) {
      const pkg = await this.packages.findById(id)
      counts.set(id, pkg?.items.length ?? 0)
    }
    return counts
  }

  private async latestEvents(
    sessionIds: string[],
  ): Promise<
    Map<string, { type: string; occurredAt: Date; detail: string | null }>
  > {
    const rows = await this.rooms.listLatestSessionEvents(sessionIds)
    return new Map(
      rows.map((row) => [
        row.sessionId,
        { type: row.type, occurredAt: row.occurredAt, detail: row.detail },
      ]),
    )
  }
}
