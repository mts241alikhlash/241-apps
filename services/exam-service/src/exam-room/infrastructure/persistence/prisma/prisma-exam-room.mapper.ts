import type { Prisma } from '../../../../generated/prisma/client.js'
import type { ExamEvent } from '../../../domain/entities/exam-event.entity.js'
import type { ExamRoom } from '../../../domain/entities/exam-room.entity.js'
import type { ExamRoomSeat } from '../../../domain/entities/exam-room-seat.entity.js'
import type { ExamRoomSupervisor } from '../../../domain/entities/exam-room-supervisor.entity.js'
import type { ExamSessionEvent } from '../../../domain/entities/exam-session-event.entity.js'
import type { ExamSessionAuditLog } from '../../../domain/entities/exam-session-audit-log.entity.js'
import type {
  ExamRoomReport,
  ExamRoomReportAbsence,
  ExamRoomFieldNote,
} from '../../../domain/entities/exam-room-report.entity.js'

type EventRow = Prisma.ExamEventGetPayload<object>
type RoomRow = Prisma.ExamRoomGetPayload<object>
type SeatRow = Prisma.ExamRoomSeatGetPayload<object>
type SupervisorRow = Prisma.ExamRoomSupervisorGetPayload<object>
type SessionEventRow = Prisma.ExamSessionEventGetPayload<object>
type AuditLogRow = Prisma.ExamSessionAuditLogGetPayload<object>
type ReportRow = Prisma.ExamRoomReportGetPayload<object>
type AbsenceRow = Prisma.ExamRoomReportAbsenceGetPayload<object>
type FieldNoteRow = Prisma.ExamRoomFieldNoteGetPayload<object>

export function toExamEvent(row: EventRow): ExamEvent {
  return {
    id: row.id,
    semesterId: row.semesterId,
    name: row.name,
    type: row.type,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    lateToleranceMinutes: row.lateToleranceMinutes,
    minSubmitMinutes: row.minSubmitMinutes,
    requireAndroidApp: row.requireAndroidApp,
    status: row.status,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toExamRoom(row: RoomRow): ExamRoom {
  return {
    id: row.id,
    eventId: row.eventId,
    code: row.code,
    name: row.name,
    building: row.building,
    capacity: row.capacity,
    technicianUserId: row.technicianUserId,
    tokenRotation: row.tokenRotation,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toExamRoomSeat(row: SeatRow): ExamRoomSeat {
  return {
    id: row.id,
    roomId: row.roomId,
    eventId: row.eventId,
    studentId: row.studentId,
    classroomId: row.classroomId,
    seatNumber: row.seatNumber,
    allowWebClient: row.allowWebClient,
    allowLateEntry: row.allowLateEntry,
    createdAt: row.createdAt,
  }
}

export function toExamRoomSupervisor(row: SupervisorRow): ExamRoomSupervisor {
  return {
    id: row.id,
    roomId: row.roomId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    scheduledUserId: row.scheduledUserId,
    actualUserId: row.actualUserId,
    substitutedByAdminId: row.substitutedByAdminId,
    substituteReason: row.substituteReason,
    substitutedAt: row.substitutedAt,
    createdAt: row.createdAt,
  }
}

export function toExamSessionEvent(row: SessionEventRow): ExamSessionEvent {
  return {
    id: row.id,
    sessionId: row.sessionId,
    clientId: row.clientId,
    type: row.type,
    isViolation: row.isViolation,
    detail: row.detail,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
  }
}

export function toExamSessionAuditLog(row: AuditLogRow): ExamSessionAuditLog {
  return {
    id: row.id,
    sessionId: row.sessionId,
    roomId: row.roomId,
    scheduleId: row.scheduleId,
    action: row.action,
    actorId: row.actorId,
    reason: row.reason,
    metadata: row.metadata as Record<string, unknown>,
    createdAt: row.createdAt,
  }
}

export function toExamRoomReport(row: ReportRow): ExamRoomReport {
  return {
    id: row.id,
    roomId: row.roomId,
    supervisorSlotId: row.supervisorSlotId,
    condition: row.condition,
    incidentNotes: row.incidentNotes,
    submittedByUserId: row.submittedByUserId,
    submittedAt: row.submittedAt,
    verifiedByUserId: row.verifiedByUserId,
    verifiedAt: row.verifiedAt,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toExamRoomReportAbsence(
  row: AbsenceRow,
): ExamRoomReportAbsence {
  return {
    id: row.id,
    reportId: row.reportId,
    studentId: row.studentId,
    scheduleId: row.scheduleId,
    reason: row.reason,
    note: row.note,
    recordedBy: row.recordedBy,
    updatedAt: row.updatedAt,
  }
}

export function toExamRoomFieldNote(row: FieldNoteRow): ExamRoomFieldNote {
  return {
    id: row.id,
    reportId: row.reportId,
    studentId: row.studentId,
    sessionId: row.sessionId,
    category: row.category,
    note: row.note,
    recordedBy: row.recordedBy,
    createdAt: row.createdAt,
  }
}
