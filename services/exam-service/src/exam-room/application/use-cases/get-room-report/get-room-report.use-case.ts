import { Injectable } from '@nestjs/common'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { IStudentDirectoryPort } from '../../../../platform/student-directory/student-directory.port.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IExamSessionRepository } from '../../../../exam-session/domain/repositories/exam-session.repository.js'
import type { RoomStaffUser } from '../../room-access.service.js'
import { RoomReportService } from '../../room-report.service.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'

export interface ReportScheduleRow {
  scheduleId: string
  packageTitle: string
  subjectName: string | null
  classroomName: string | null
  startsAt: string
  endsAt: string
  registeredCount: number
  startedCount: number
  submittedCount: number
  absentCount: number
}

export interface ReportAbsenceRow {
  id: string
  studentId: string
  studentName: string | null
  nis: string | null
  scheduleId: string
  reason: string
  note: string | null
  updatedAt: string
}

export interface ReportFieldNoteRow {
  id: string
  studentId: string
  studentName: string | null
  sessionId: string | null
  category: string
  note: string
  recordedAt: string
}

export interface ReportAuditRow {
  id: string
  sessionId: string | null
  action: string
  actorId: string
  reason: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface RoomReportView {
  reportId: string
  roomId: string
  slotId: string
  status: string
  condition: string
  incidentNotes: string | null
  submittedAt: string | null
  verifiedAt: string | null
  slot: { startsAt: string; endsAt: string }
  schedules: ReportScheduleRow[]
  absences: ReportAbsenceRow[]
  fieldNotes: ReportFieldNoteRow[]
  auditLogs: ReportAuditRow[]
}

@Injectable()
export class GetRoomReportUseCase {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly sessions: IExamSessionRepository,
    private readonly schedules: IExamScheduleRepository,
    private readonly students: IStudentDirectoryPort,
    private readonly academic: IAcademicLookupPort,
    private readonly reports: RoomReportService,
  ) {}

  async execute(
    user: RoomStaffUser,
    roomId: string,
    slotId: string,
  ): Promise<RoomReportView> {
    const { room, slot, report } = await this.reports.load(user, roomId, slotId)
    const seats = await this.rooms.listSeatsByRoom(roomId)
    const sessions = await this.sessions.listByRoom(roomId)
    const overlapping = await this.slotSchedules(room.eventId, slot)
    const schedules = overlapping.filter(
      (row) =>
        row.startsAt.getTime() >= slot.startsAt.getTime() &&
        row.startsAt.getTime() < slot.endsAt.getTime(),
    )
    const absences = await this.rooms.listAbsencesByReport(report.id)
    const fieldNotes = await this.rooms.listFieldNotesByReport(report.id)
    const auditLogs = (await this.rooms.listAuditLogsByRoom(roomId)).filter(
      (row) =>
        row.createdAt.getTime() >= slot.startsAt.getTime() &&
        row.createdAt.getTime() < slot.endsAt.getTime(),
    )
    const studentIds = [
      ...new Set([
        ...seats.map((seat) => seat.studentId),
        ...absences.map((row) => row.studentId),
        ...fieldNotes.map((row) => row.studentId),
      ]),
    ]
    const refs = new Map(
      (await this.students.refsByIds(studentIds)).map((ref) => [ref.id, ref]),
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
    const scheduleIds = new Set(schedules.map((row) => row.id))

    return {
      reportId: report.id,
      roomId: report.roomId,
      slotId: report.supervisorSlotId,
      status: report.status,
      condition: report.condition,
      incidentNotes: report.incidentNotes,
      submittedAt: report.submittedAt?.toISOString() ?? null,
      verifiedAt: report.verifiedAt?.toISOString() ?? null,
      slot: {
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
      },
      schedules: schedules.map((schedule) => {
        const inClass = seats.filter(
          (seat) => seat.classroomId === schedule.classroomId,
        )
        const classSessions = sessions.filter(
          (session) =>
            session.scheduleId === schedule.id &&
            inClass.some((seat) => seat.studentId === session.studentId),
        )
        return {
          scheduleId: schedule.id,
          packageTitle: schedule.packageTitle,
          subjectName: subjectNames.get(schedule.subjectId) ?? null,
          classroomName: classroomNames.get(schedule.classroomId) ?? null,
          startsAt: schedule.startsAt.toISOString(),
          endsAt: schedule.endsAt.toISOString(),
          registeredCount: inClass.length,
          startedCount: classSessions.length,
          submittedCount: classSessions.filter(
            (session) => session.status !== 'IN_PROGRESS',
          ).length,
          absentCount: absences.filter((row) => row.scheduleId === schedule.id)
            .length,
        }
      }),
      absences: absences
        .filter((row) => scheduleIds.has(row.scheduleId))
        .map((row) => ({
          id: row.id,
          studentId: row.studentId,
          studentName: refs.get(row.studentId)?.name ?? null,
          nis: refs.get(row.studentId)?.nis ?? null,
          scheduleId: row.scheduleId,
          reason: row.reason,
          note: row.note,
          updatedAt: row.updatedAt.toISOString(),
        })),
      fieldNotes: fieldNotes.map((row) => ({
        id: row.id,
        studentId: row.studentId,
        studentName: refs.get(row.studentId)?.name ?? null,
        sessionId: row.sessionId,
        category: row.category,
        note: row.note,
        recordedAt: row.createdAt.toISOString(),
      })),
      auditLogs: auditLogs.map((row) => ({
        id: row.id,
        sessionId: row.sessionId,
        action: row.action,
        actorId: row.actorId,
        reason: row.reason,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
      })),
    }
  }

  private slotSchedules(
    eventId: string,
    slot: { startsAt: Date; endsAt: Date },
  ) {
    return this.schedules.listSchedulesForEventWindow(
      eventId,
      slot.startsAt,
      slot.endsAt,
    )
  }
}
