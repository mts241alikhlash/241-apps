import { randomUUID } from 'node:crypto'
import type {
  ExamEvent,
  ExamEventEdit,
  ExamEventStatus,
  NewExamEvent,
} from '../domain/entities/exam-event.entity.js'
import type {
  ExamRoom,
  ExamRoomEdit,
  NewExamRoom,
} from '../domain/entities/exam-room.entity.js'
import type {
  AutoDistributeInput,
  ExamRoomSeat,
  NewExamRoomSeat,
  SeatFlagsPatch,
} from '../domain/entities/exam-room-seat.entity.js'
import type {
  ExamRoomSupervisor,
  NewExamRoomSupervisor,
  SupervisorSubstitution,
} from '../domain/entities/exam-room-supervisor.entity.js'
import type {
  ExamRoomReport,
  ExamRoomReportAbsence,
  ExamRoomReportDraft,
  ExamRoomFieldNote,
  NewExamRoomFieldNote,
  NewExamRoomReport,
  NewExamRoomReportAbsence,
} from '../domain/entities/exam-room-report.entity.js'
import type {
  ExamSessionEvent,
  NewExamSessionEvent,
} from '../domain/entities/exam-session-event.entity.js'
import type {
  ExamSessionAuditLog,
  NewExamSessionAuditLog,
} from '../domain/entities/exam-session-audit-log.entity.js'
import {
  DuplicateRoomCodeError,
  ExamRoomConflictError,
  SeatAlreadyTakenError,
} from '../domain/errors/exam-room.errors.js'
import { interleaveByClassroom } from '../domain/policies/seat-interleave.policy.js'
import {
  IExamRoomRepository,
  type AssignSeatInput,
  type ExamEventListQuery,
} from '../domain/repositories/exam-room.repository.js'

export class FakeExamRoomRepository extends IExamRoomRepository {
  readonly events = new Map<string, ExamEvent>()
  readonly rooms = new Map<string, ExamRoom>()
  readonly seats = new Map<string, ExamRoomSeat>()
  readonly supervisors = new Map<string, ExamRoomSupervisor>()
  readonly sessionEvents = new Map<string, ExamSessionEvent>()
  readonly auditLogs: ExamSessionAuditLog[] = []
  readonly reports = new Map<string, ExamRoomReport>()
  readonly absences = new Map<string, ExamRoomReportAbsence>()
  readonly fieldNotes: ExamRoomFieldNote[] = []
  private absenceClock = 0

  createEvent(input: NewExamEvent) {
    const now = new Date()
    const event: ExamEvent = {
      id: randomUUID(),
      semesterId: input.semesterId,
      name: input.name,
      type: input.type,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      lateToleranceMinutes: input.lateToleranceMinutes ?? 30,
      minSubmitMinutes: input.minSubmitMinutes ?? 20,
      requireAndroidApp: input.requireAndroidApp ?? true,
      status: 'DRAFT',
      createdById: input.createdById,
      createdAt: now,
      updatedAt: now,
    }
    this.events.set(event.id, event)
    return Promise.resolve(event)
  }

  updateEvent(id: string, edit: ExamEventEdit) {
    const event = this.events.get(id)
    if (!event) return Promise.resolve(null)
    const updated: ExamEvent = { ...event, ...edit, updatedAt: new Date() }
    this.events.set(id, updated)
    return Promise.resolve(updated)
  }

  findEventById(id: string) {
    return Promise.resolve(this.events.get(id) ?? null)
  }

  listEvents(query: ExamEventListQuery) {
    const rows = [...this.events.values()]
      .filter((row) => !query.semesterId || row.semesterId === query.semesterId)
      .filter((row) => !query.status || row.status === query.status)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    const page = query.page ?? 1
    const limit = query.limit ?? 10
    return Promise.resolve({
      data: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
      page,
      limit,
    })
  }

  listEventIdsSupervisedBy(userId: string, from: Date) {
    const ids = new Set<string>()
    for (const slot of this.supervisors.values()) {
      if (
        slot.actualUserId === userId &&
        slot.endsAt.getTime() > from.getTime()
      ) {
        const room = this.rooms.get(slot.roomId)
        if (room !== undefined) ids.add(room.eventId)
      }
    }
    return Promise.resolve([...ids])
  }

  createRoom(input: NewExamRoom) {
    const taken = [...this.rooms.values()].some(
      (row) => row.eventId === input.eventId && row.code === input.code,
    )
    if (taken) return Promise.reject(new DuplicateRoomCodeError())
    const now = new Date()
    const room: ExamRoom = {
      id: randomUUID(),
      eventId: input.eventId,
      code: input.code,
      name: input.name,
      building: input.building ?? null,
      capacity: input.capacity,
      technicianUserId: input.technicianUserId ?? null,
      tokenRotation: 0,
      createdAt: now,
      updatedAt: now,
    }
    this.rooms.set(room.id, room)
    return Promise.resolve(room)
  }

  updateRoom(id: string, edit: ExamRoomEdit) {
    const room = this.rooms.get(id)
    if (!room) return Promise.resolve(null)
    if (
      edit.code !== undefined &&
      [...this.rooms.values()].some(
        (row) =>
          row.id !== id &&
          row.eventId === room.eventId &&
          row.code === edit.code,
      )
    ) {
      return Promise.reject(new DuplicateRoomCodeError())
    }
    const updated: ExamRoom = { ...room, ...edit, updatedAt: new Date() }
    this.rooms.set(id, updated)
    return Promise.resolve(updated)
  }

  findRoomById(id: string) {
    return Promise.resolve(this.rooms.get(id) ?? null)
  }

  listRoomsByEvent(eventId: string) {
    return Promise.resolve(
      [...this.rooms.values()]
        .filter((row) => row.eventId === eventId)
        .sort((a, b) => a.code.localeCompare(b.code)),
    )
  }

  listRoomsByEventStatus(status: ExamEventStatus) {
    return Promise.resolve(
      [...this.rooms.values()]
        .filter((row) => this.events.get(row.eventId)?.status === status)
        .sort(
          (a, b) =>
            a.eventId.localeCompare(b.eventId) || a.code.localeCompare(b.code),
        ),
    )
  }

  listRoomsByTechnician(userId: string) {
    return Promise.resolve(
      [...this.rooms.values()]
        .filter((row) => row.technicianUserId === userId)
        .sort(
          (a, b) =>
            a.eventId.localeCompare(b.eventId) || a.code.localeCompare(b.code),
        ),
    )
  }

  listRoomsSupervisedBy(userId: string) {
    const roomIds = new Set(
      [...this.supervisors.values()]
        .filter(
          (slot) =>
            slot.actualUserId === userId || slot.scheduledUserId === userId,
        )
        .map((slot) => slot.roomId),
    )
    return Promise.resolve(
      [...this.rooms.values()]
        .filter((row) => roomIds.has(row.id))
        .sort(
          (a, b) =>
            a.eventId.localeCompare(b.eventId) || a.code.localeCompare(b.code),
        ),
    )
  }

  async rotateRoomToken(id: string, audit: NewExamSessionAuditLog) {
    const room = this.rooms.get(id)
    if (!room) return null
    const updated: ExamRoom = {
      ...room,
      tokenRotation: room.tokenRotation + 1,
      updatedAt: new Date(),
    }
    this.rooms.set(id, updated)
    await this.writeAuditLog({
      roomId: id,
      action: audit.action,
      actorId: audit.actorId,
      reason: audit.reason,
      metadata: audit.metadata,
    })
    return updated
  }

  assignSeat(input: AssignSeatInput) {
    const sameStudent = [...this.seats.values()].find(
      (row) =>
        row.eventId === input.eventId && row.studentId === input.studentId,
    )
    if (sameStudent) return Promise.reject(new SeatAlreadyTakenError('student'))
    const sameSeat = [...this.seats.values()].find(
      (row) =>
        row.roomId === input.roomId && row.seatNumber === input.seatNumber,
    )
    if (sameSeat) return Promise.reject(new SeatAlreadyTakenError('seat'))
    const seat: ExamRoomSeat = {
      id: randomUUID(),
      roomId: input.roomId,
      eventId: input.eventId,
      studentId: input.studentId,
      classroomId: input.classroomId,
      seatNumber: input.seatNumber,
      allowWebClient: false,
      allowLateEntry: false,
      createdAt: new Date(),
    }
    this.seats.set(seat.id, seat)
    return Promise.resolve(seat)
  }

  assignSeats(inputs: AssignSeatInput[]) {
    const seenStudents = new Set<string>()
    const seenSeats = new Set<string>()
    for (const input of inputs) {
      const studentKey = `${input.eventId}:${input.studentId}`
      const seatKey = `${input.roomId}:${input.seatNumber}`
      const sameStudent =
        seenStudents.has(studentKey) ||
        [...this.seats.values()].some(
          (row) =>
            row.eventId === input.eventId && row.studentId === input.studentId,
        )
      if (sameStudent)
        return Promise.reject(new SeatAlreadyTakenError('student'))
      const sameSeat =
        seenSeats.has(seatKey) ||
        [...this.seats.values()].some(
          (row) =>
            row.roomId === input.roomId && row.seatNumber === input.seatNumber,
        )
      if (sameSeat) return Promise.reject(new SeatAlreadyTakenError('seat'))
      seenStudents.add(studentKey)
      seenSeats.add(seatKey)
    }
    const created: ExamRoomSeat[] = []
    for (const input of inputs) {
      const seat: ExamRoomSeat = {
        id: randomUUID(),
        roomId: input.roomId,
        eventId: input.eventId,
        studentId: input.studentId,
        classroomId: input.classroomId,
        seatNumber: input.seatNumber,
        allowWebClient: false,
        allowLateEntry: false,
        createdAt: new Date(),
      }
      this.seats.set(seat.id, seat)
      created.push(seat)
    }
    return Promise.resolve(created)
  }

  findSeat(eventId: string, studentId: string) {
    const found = [...this.seats.values()].find(
      (row) => row.eventId === eventId && row.studentId === studentId,
    )
    return Promise.resolve(found ?? null)
  }

  findSeatForStudent(eventId: string, studentId: string) {
    const found = [...this.seats.values()].find(
      (row) => row.eventId === eventId && row.studentId === studentId,
    )
    if (found === undefined) return Promise.resolve(null)
    const room = this.rooms.get(found.roomId)
    return Promise.resolve(
      room ? { roomName: room.name, seatNumber: found.seatNumber } : null,
    )
  }

  listSeatsByRoom(roomId: string) {
    return Promise.resolve(
      [...this.seats.values()]
        .filter((row) => row.roomId === roomId)
        .sort((a, b) => a.seatNumber - b.seatNumber),
    )
  }

  listSeatsByEvent(eventId: string) {
    return Promise.resolve(
      [...this.seats.values()].filter((row) => row.eventId === eventId),
    )
  }

  setSeatFlags(eventId: string, studentId: string, patch: SeatFlagsPatch) {
    const found = [...this.seats.values()].find(
      (row) => row.eventId === eventId && row.studentId === studentId,
    )
    if (found === undefined) return Promise.resolve(null)
    const updated: ExamRoomSeat = { ...found, ...patch }
    this.seats.set(found.id, updated)
    return Promise.resolve(updated)
  }

  setSeatFlagsWithAudit(
    eventId: string,
    studentId: string,
    patch: SeatFlagsPatch,
    audit: NewExamSessionAuditLog,
  ) {
    const found = [...this.seats.values()].find(
      (row) => row.eventId === eventId && row.studentId === studentId,
    )
    if (found === undefined) return Promise.resolve(null)
    const updated: ExamRoomSeat = { ...found, ...patch }
    this.seats.set(found.id, updated)
    return this.writeAuditLog({
      roomId: audit.roomId ?? null,
      action: audit.action,
      actorId: audit.actorId,
      reason: audit.reason,
      metadata: audit.metadata,
    }).then(() => updated)
  }

  removeSeat(roomId: string, studentId: string) {
    const found = [...this.seats.values()].find(
      (row) => row.roomId === roomId && row.studentId === studentId,
    )
    if (!found) return Promise.resolve(false)
    this.seats.delete(found.id)
    return Promise.resolve(true)
  }

  async autoDistributeSeats(input: AutoDistributeInput) {
    const rooms = input.roomIds
      .map((id) => this.rooms.get(id))
      .filter((room): room is ExamRoom => room?.eventId === input.eventId)
    const ordered = input.interleaveByClassroom
      ? interleaveByClassroom(input.students)
      : [...input.students]
    const assigned: ExamRoomSeat[] = []
    const unassigned: NewExamRoomSeat[] = []
    for (const student of ordered) {
      const placed = await this.placeStudent(input.eventId, rooms, student)
      if (placed === null) unassigned.push(student)
      else assigned.push(placed)
    }
    return { assigned, unassigned }
  }

  private async placeStudent(
    eventId: string,
    rooms: ExamRoom[],
    student: NewExamRoomSeat,
  ): Promise<ExamRoomSeat | null> {
    const already = [...this.seats.values()].some(
      (row) => row.eventId === eventId && row.studentId === student.studentId,
    )
    if (already) return null
    for (const room of rooms) {
      const taken = await this.listSeatsByRoom(room.id)
      if (taken.length >= room.capacity) continue
      const used = new Set(taken.map((row) => row.seatNumber))
      let seatNumber = 1
      while (used.has(seatNumber)) seatNumber += 1
      return this.assignSeat({
        roomId: room.id,
        eventId,
        studentId: student.studentId,
        classroomId: student.classroomId,
        seatNumber,
      })
    }
    return null
  }

  assignSupervisor(input: NewExamRoomSupervisor) {
    const supervisor: ExamRoomSupervisor = {
      id: randomUUID(),
      roomId: input.roomId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      scheduledUserId: input.scheduledUserId,
      actualUserId: input.scheduledUserId,
      substitutedByAdminId: null,
      substituteReason: null,
      substitutedAt: null,
      createdAt: new Date(),
    }
    this.supervisors.set(supervisor.id, supervisor)
    return Promise.resolve(supervisor)
  }

  listSupervisors(roomId: string) {
    return Promise.resolve(
      [...this.supervisors.values()]
        .filter((row) => row.roomId === roomId)
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    )
  }

  findSupervisorAt(roomId: string, at: Date) {
    const found = [...this.supervisors.values()].find(
      (row) =>
        row.roomId === roomId &&
        row.startsAt.getTime() <= at.getTime() &&
        row.endsAt.getTime() > at.getTime(),
    )
    return Promise.resolve(found ?? null)
  }

  findSupervisorById(slotId: string) {
    return Promise.resolve(this.supervisors.get(slotId) ?? null)
  }

  findSupervisorSlotForUser(roomId: string, userId: string, at: Date) {
    const found = [...this.supervisors.values()].find(
      (row) =>
        row.roomId === roomId &&
        row.actualUserId === userId &&
        row.startsAt.getTime() <= at.getTime() &&
        row.endsAt.getTime() > at.getTime(),
    )
    return Promise.resolve(found ?? null)
  }

  async substituteSupervisor(input: SupervisorSubstitution) {
    const supervisor = this.supervisors.get(input.supervisorId)
    if (!supervisor) return null
    const updated: ExamRoomSupervisor = {
      ...supervisor,
      actualUserId: input.actualUserId,
      substitutedByAdminId: input.substitutedByAdminId,
      substituteReason: input.reason,
      substitutedAt: input.at,
    }
    this.supervisors.set(supervisor.id, updated)
    await this.writeAuditLog({
      roomId: supervisor.roomId,
      action: 'SUBSTITUTE_SUPERVISOR',
      actorId: input.substitutedByAdminId,
      reason: input.reason,
      metadata: {
        slotId: supervisor.id,
        scheduledUserId: supervisor.scheduledUserId,
        actualUserId: input.actualUserId,
      },
    })
    return updated
  }

  findReportBySlot(roomId: string, supervisorSlotId: string) {
    const found = [...this.reports.values()].find(
      (row) =>
        row.roomId === roomId && row.supervisorSlotId === supervisorSlotId,
    )
    return Promise.resolve(found ?? null)
  }

  createReport(input: NewExamRoomReport) {
    const taken = [...this.reports.values()].some(
      (row) => row.supervisorSlotId === input.supervisorSlotId,
    )
    if (taken) {
      return Promise.reject(
        new ExamRoomConflictError('exam_room_reports_supervisor_slot_id_key'),
      )
    }
    const now = new Date()
    const report: ExamRoomReport = {
      id: randomUUID(),
      roomId: input.roomId,
      supervisorSlotId: input.supervisorSlotId,
      condition: input.condition ?? 'SMOOTH',
      incidentNotes: input.incidentNotes ?? null,
      submittedByUserId: null,
      submittedAt: null,
      verifiedByUserId: null,
      verifiedAt: null,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    }
    this.reports.set(report.id, report)
    return Promise.resolve(report)
  }

  saveReportDraft(reportId: string, draft: ExamRoomReportDraft) {
    const report = this.reports.get(reportId)
    if (report?.status !== 'DRAFT') return Promise.resolve(null)
    const updated: ExamRoomReport = { ...report, updatedAt: new Date() }
    if (draft.condition !== undefined) updated.condition = draft.condition
    if (draft.incidentNotes !== undefined) {
      updated.incidentNotes = draft.incidentNotes
    }
    this.reports.set(reportId, updated)
    return Promise.resolve(updated)
  }

  recordAbsence(input: NewExamRoomReportAbsence) {
    const parent = this.reports.get(input.reportId)
    if (parent?.status !== 'DRAFT') return Promise.resolve(null)
    const existing = [...this.absences.values()].find(
      (row) =>
        row.reportId === input.reportId &&
        row.studentId === input.studentId &&
        row.scheduleId === input.scheduleId,
    )
    this.absenceClock = Math.max(this.absenceClock + 1, Date.now())
    const row: ExamRoomReportAbsence = {
      id: existing?.id ?? randomUUID(),
      reportId: input.reportId,
      studentId: input.studentId,
      scheduleId: input.scheduleId,
      reason: input.reason,
      note: input.note ?? null,
      recordedBy: input.recordedBy,
      updatedAt: new Date(this.absenceClock),
    }
    this.absences.set(row.id, row)
    return Promise.resolve(row)
  }

  recordFieldNote(input: NewExamRoomFieldNote) {
    const parent = this.reports.get(input.reportId)
    if (parent?.status !== 'DRAFT') return Promise.resolve(null)
    const row: ExamRoomFieldNote = {
      id: randomUUID(),
      reportId: input.reportId,
      studentId: input.studentId,
      sessionId: input.sessionId ?? null,
      category: input.category,
      note: input.note,
      recordedBy: input.recordedBy,
      createdAt: new Date(),
    }
    this.fieldNotes.push(row)
    return Promise.resolve(row)
  }

  submitReport(reportId: string, submittedByUserId: string, at: Date) {
    const report = this.reports.get(reportId)
    if (report?.status !== 'DRAFT') return Promise.resolve(null)
    const updated: ExamRoomReport = {
      ...report,
      status: 'SUBMITTED',
      submittedByUserId,
      submittedAt: at,
      updatedAt: new Date(),
    }
    this.reports.set(reportId, updated)
    return Promise.resolve(updated)
  }

  listAbsencesByReport(reportId: string) {
    return Promise.resolve(
      [...this.absences.values()]
        .filter((row) => row.reportId === reportId)
        .sort(
          (a, b) =>
            a.updatedAt.getTime() - b.updatedAt.getTime() ||
            a.id.localeCompare(b.id),
        ),
    )
  }

  listFieldNotesByReport(reportId: string) {
    return Promise.resolve(
      this.fieldNotes
        .filter((row) => row.reportId === reportId)
        .sort(
          (a, b) =>
            a.createdAt.getTime() - b.createdAt.getTime() ||
            a.id.localeCompare(b.id),
        ),
    )
  }

  reopenReport(reportId: string) {
    const report = this.reports.get(reportId)
    if (!report || report.status === 'DRAFT') return Promise.resolve(null)
    const updated: ExamRoomReport = {
      ...report,
      status: 'DRAFT',
      submittedByUserId: null,
      submittedAt: null,
      verifiedByUserId: null,
      verifiedAt: null,
      updatedAt: new Date(),
    }
    this.reports.set(reportId, updated)
    return Promise.resolve(updated)
  }

  verifyReport(reportId: string, verifiedByUserId: string, at: Date) {
    const report = this.reports.get(reportId)
    if (report?.status !== 'SUBMITTED') return Promise.resolve(null)
    const updated: ExamRoomReport = {
      ...report,
      status: 'VERIFIED',
      verifiedByUserId,
      verifiedAt: at,
      updatedAt: new Date(),
    }
    this.reports.set(reportId, updated)
    return Promise.resolve(updated)
  }

  listAbsencesByScheduleStudent(scheduleId: string, studentId: string) {
    return Promise.resolve(
      [...this.absences.values()]
        .filter(
          (row) => row.scheduleId === scheduleId && row.studentId === studentId,
        )
        .sort(
          (a, b) =>
            a.updatedAt.getTime() - b.updatedAt.getTime() ||
            a.id.localeCompare(b.id),
        ),
    )
  }

  listAbsencesByScheduleStudents(scheduleId: string, studentIds: string[]) {
    const wanted = new Set(studentIds)
    return Promise.resolve(
      [...this.absences.values()]
        .filter(
          (row) => row.scheduleId === scheduleId && wanted.has(row.studentId),
        )
        .sort(
          (a, b) =>
            a.updatedAt.getTime() - b.updatedAt.getTime() ||
            a.id.localeCompare(b.id),
        ),
    )
  }

  recordSessionEvents(sessionId: string, events: NewExamSessionEvent[]) {
    const stored = events.map((event) => {
      const existing = [...this.sessionEvents.values()].find(
        (row) => row.sessionId === sessionId && row.clientId === event.clientId,
      )
      if (existing) return existing
      const row: ExamSessionEvent = {
        id: randomUUID(),
        sessionId,
        ...event,
        createdAt: new Date(),
      }
      this.sessionEvents.set(row.id, row)
      return row
    })
    return Promise.resolve(stored)
  }

  listSessionEvents(sessionId: string) {
    return Promise.resolve(
      [...this.sessionEvents.values()]
        .filter((row) => row.sessionId === sessionId)
        .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()),
    )
  }

  listLatestSessionEvents(sessionIds: string[]) {
    const latest = new Map<string, ExamSessionEvent>()
    for (const row of this.sessionEvents.values()) {
      if (!sessionIds.includes(row.sessionId)) continue
      const held = latest.get(row.sessionId)
      if (
        held === undefined ||
        row.occurredAt.getTime() > held.occurredAt.getTime() ||
        (row.occurredAt.getTime() === held.occurredAt.getTime() &&
          row.id > held.id)
      ) {
        latest.set(row.sessionId, row)
      }
    }
    return Promise.resolve([...latest.values()])
  }

  writeAuditLog(input: NewExamSessionAuditLog) {
    const row: ExamSessionAuditLog = {
      id: randomUUID(),
      sessionId: input.sessionId ?? null,
      roomId: input.roomId ?? null,
      scheduleId: input.scheduleId ?? null,
      action: input.action,
      actorId: input.actorId,
      reason: input.reason,
      metadata: input.metadata ?? {},
      createdAt: new Date(),
    }
    this.auditLogs.push(row)
    return Promise.resolve(row)
  }

  listAuditLogs(sessionId: string) {
    return Promise.resolve(
      this.auditLogs.filter((row) => row.sessionId === sessionId),
    )
  }

  listAuditLogsByRoom(roomId: string) {
    return Promise.resolve(
      this.auditLogs
        .filter((row) => row.roomId === roomId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    )
  }
}
