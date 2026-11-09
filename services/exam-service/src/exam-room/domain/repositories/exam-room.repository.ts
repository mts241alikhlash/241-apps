import type { PaginatedResult } from '@mts241alikhlash/nest-core/domain'
import type {
  ExamEvent,
  ExamEventEdit,
  ExamEventStatus,
  NewExamEvent,
} from '../entities/exam-event.entity.js'
import type {
  ExamRoom,
  ExamRoomEdit,
  NewExamRoom,
} from '../entities/exam-room.entity.js'
import type {
  AutoDistributeInput,
  AutoDistributeResult,
  ExamRoomSeat,
  NewExamRoomSeat,
  SeatFlagsPatch,
} from '../entities/exam-room-seat.entity.js'
import type {
  ExamRoomSupervisor,
  NewExamRoomSupervisor,
  SupervisorSubstitution,
} from '../entities/exam-room-supervisor.entity.js'
import type {
  ExamRoomReport,
  ExamRoomReportAbsence,
  ExamRoomReportDraft,
  ExamRoomFieldNote,
  NewExamRoomFieldNote,
  NewExamRoomReport,
  NewExamRoomReportAbsence,
} from '../entities/exam-room-report.entity.js'
import type {
  ExamSessionEvent,
  NewExamSessionEvent,
} from '../entities/exam-session-event.entity.js'
import type {
  ExamSessionAuditLog,
  NewExamSessionAuditLog,
} from '../entities/exam-session-audit-log.entity.js'

export interface ExamEventListQuery {
  semesterId?: string
  status?: ExamEventStatus
  page?: number
  limit?: number
}

export interface AssignSeatInput extends NewExamRoomSeat {
  roomId: string
  eventId: string
  seatNumber: number
}

export abstract class IExamRoomRepository {
  abstract createEvent(input: NewExamEvent): Promise<ExamEvent>
  abstract updateEvent(
    id: string,
    edit: ExamEventEdit,
  ): Promise<ExamEvent | null>
  abstract findEventById(id: string): Promise<ExamEvent | null>
  abstract listEvents(
    query: ExamEventListQuery,
  ): Promise<PaginatedResult<ExamEvent>>
  abstract listEventIdsSupervisedBy(userId: string, at: Date): Promise<string[]>

  abstract createRoom(input: NewExamRoom): Promise<ExamRoom>
  abstract updateRoom(id: string, edit: ExamRoomEdit): Promise<ExamRoom | null>
  abstract findRoomById(id: string): Promise<ExamRoom | null>
  abstract listRoomsByEvent(eventId: string): Promise<ExamRoom[]>
  abstract listRoomsByEventStatus(status: ExamEventStatus): Promise<ExamRoom[]>
  abstract listRoomsByTechnician(userId: string): Promise<ExamRoom[]>
  abstract listRoomsSupervisedBy(userId: string): Promise<ExamRoom[]>
  abstract rotateRoomToken(
    id: string,
    audit: NewExamSessionAuditLog,
  ): Promise<ExamRoom | null>

  abstract assignSeat(input: AssignSeatInput): Promise<ExamRoomSeat>
  abstract assignSeats(inputs: AssignSeatInput[]): Promise<ExamRoomSeat[]>
  abstract findSeat(
    eventId: string,
    studentId: string,
  ): Promise<ExamRoomSeat | null>
  abstract findSeatForStudent(
    eventId: string,
    studentId: string,
  ): Promise<{ roomName: string; seatNumber: number } | null>
  abstract listSeatsByRoom(roomId: string): Promise<ExamRoomSeat[]>
  abstract listSeatsByEvent(eventId: string): Promise<ExamRoomSeat[]>
  abstract removeSeat(roomId: string, studentId: string): Promise<boolean>
  abstract setSeatFlags(
    eventId: string,
    studentId: string,
    patch: SeatFlagsPatch,
  ): Promise<ExamRoomSeat | null>
  abstract setSeatFlagsWithAudit(
    eventId: string,
    studentId: string,
    patch: SeatFlagsPatch,
    audit: NewExamSessionAuditLog,
  ): Promise<ExamRoomSeat | null>
  abstract autoDistributeSeats(
    input: AutoDistributeInput,
  ): Promise<AutoDistributeResult>

  abstract assignSupervisor(
    input: NewExamRoomSupervisor,
  ): Promise<ExamRoomSupervisor>
  abstract listSupervisors(roomId: string): Promise<ExamRoomSupervisor[]>
  abstract findSupervisorAt(
    roomId: string,
    at: Date,
  ): Promise<ExamRoomSupervisor | null>
  abstract findSupervisorById(
    slotId: string,
  ): Promise<ExamRoomSupervisor | null>
  abstract findSupervisorSlotForUser(
    roomId: string,
    userId: string,
    at: Date,
  ): Promise<ExamRoomSupervisor | null>
  abstract substituteSupervisor(
    input: SupervisorSubstitution,
  ): Promise<ExamRoomSupervisor | null>

  abstract findReportBySlot(
    roomId: string,
    supervisorSlotId: string,
  ): Promise<ExamRoomReport | null>
  abstract createReport(input: NewExamRoomReport): Promise<ExamRoomReport>
  abstract saveReportDraft(
    reportId: string,
    draft: ExamRoomReportDraft,
  ): Promise<ExamRoomReport | null>
  abstract recordAbsence(
    input: NewExamRoomReportAbsence,
  ): Promise<ExamRoomReportAbsence | null>
  abstract recordFieldNote(
    input: NewExamRoomFieldNote,
  ): Promise<ExamRoomFieldNote | null>
  abstract submitReport(
    reportId: string,
    submittedByUserId: string,
    at: Date,
  ): Promise<ExamRoomReport | null>
  abstract listAbsencesByReport(
    reportId: string,
  ): Promise<ExamRoomReportAbsence[]>
  abstract listFieldNotesByReport(
    reportId: string,
  ): Promise<ExamRoomFieldNote[]>
  abstract reopenReport(reportId: string): Promise<ExamRoomReport | null>
  abstract verifyReport(
    reportId: string,
    verifiedByUserId: string,
    at: Date,
  ): Promise<ExamRoomReport | null>
  abstract listAbsencesByScheduleStudent(
    scheduleId: string,
    studentId: string,
  ): Promise<ExamRoomReportAbsence[]>
  abstract listAbsencesByScheduleStudents(
    scheduleId: string,
    studentIds: string[],
  ): Promise<ExamRoomReportAbsence[]>

  abstract recordSessionEvents(
    sessionId: string,
    events: NewExamSessionEvent[],
  ): Promise<ExamSessionEvent[]>
  abstract listSessionEvents(sessionId: string): Promise<ExamSessionEvent[]>
  abstract listLatestSessionEvents(
    sessionIds: string[],
  ): Promise<ExamSessionEvent[]>

  abstract writeAuditLog(
    input: NewExamSessionAuditLog,
  ): Promise<ExamSessionAuditLog>
  abstract listAuditLogs(sessionId: string): Promise<ExamSessionAuditLog[]>
  abstract listAuditLogsByRoom(roomId: string): Promise<ExamSessionAuditLog[]>
}
