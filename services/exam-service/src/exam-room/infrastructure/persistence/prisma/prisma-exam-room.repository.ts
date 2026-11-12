import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { Prisma } from '../../../../generated/prisma/client.js'
import type { PaginatedResult } from '@mts241alikhlash/nest-core/domain'
import type {
  ExamEvent,
  ExamEventEdit,
  ExamEventStatus,
  NewExamEvent,
} from '../../../domain/entities/exam-event.entity.js'
import type {
  ExamRoom,
  ExamRoomEdit,
  NewExamRoom,
} from '../../../domain/entities/exam-room.entity.js'
import type {
  AutoDistributeInput,
  AutoDistributeResult,
  ExamRoomSeat,
  NewExamRoomSeat,
  SeatFlagsPatch,
} from '../../../domain/entities/exam-room-seat.entity.js'
import type {
  ExamRoomSupervisor,
  NewExamRoomSupervisor,
  SupervisorSubstitution,
} from '../../../domain/entities/exam-room-supervisor.entity.js'
import type {
  ExamRoomReport,
  ExamRoomReportAbsence,
  ExamRoomReportDraft,
  ExamRoomFieldNote,
  NewExamRoomFieldNote,
  NewExamRoomReport,
  NewExamRoomReportAbsence,
} from '../../../domain/entities/exam-room-report.entity.js'
import type {
  ExamSessionEvent,
  NewExamSessionEvent,
} from '../../../domain/entities/exam-session-event.entity.js'
import type {
  ExamSessionAuditLog,
  NewExamSessionAuditLog,
} from '../../../domain/entities/exam-session-audit-log.entity.js'
import {
  uniqueConstraintOf,
  uniqueViolationError,
} from '../../../domain/errors/exam-room.errors.js'
import { interleaveByClassroom } from '../../../domain/policies/seat-interleave.policy.js'
import {
  IExamRoomRepository,
  type AssignSeatInput,
  type ExamEventListQuery,
} from '../../../domain/repositories/exam-room.repository.js'
import {
  toExamEvent,
  toExamRoom,
  toExamRoomSeat,
  toExamRoomSupervisor,
  toExamRoomFieldNote,
  toExamRoomReport,
  toExamRoomReportAbsence,
  toExamSessionAuditLog,
  toExamSessionEvent,
} from './prisma-exam-room.mapper.js'

function conflictError(error: Prisma.PrismaClientKnownRequestError): Error {
  return uniqueViolationError(uniqueConstraintOf(error.meta ?? {}))
}

@Injectable()
export class PrismaExamRoomRepository extends IExamRoomRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async createEvent(input: NewExamEvent): Promise<ExamEvent> {
    const row = await this.prisma.examEvent.create({ data: input })
    return toExamEvent(row)
  }

  async updateEvent(
    id: string,
    edit: ExamEventEdit,
  ): Promise<ExamEvent | null> {
    try {
      const row = await this.prisma.examEvent.update({
        where: { id },
        data: edit,
      })
      return toExamEvent(row)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null
      }
      throw error
    }
  }

  async findEventById(id: string): Promise<ExamEvent | null> {
    const row = await this.prisma.examEvent.findUnique({ where: { id } })
    return row ? toExamEvent(row) : null
  }

  async isEventLinked(id: string): Promise<boolean> {
    const [activity, schedule] = await Promise.all([
      this.prisma.examActivity.findFirst({
        where: { eventId: id },
        select: { id: true },
      }),
      this.prisma.examSchedule.findFirst({
        where: { eventId: id },
        select: { id: true },
      }),
    ])
    return activity !== null || schedule !== null
  }

  async listEvents(
    query: ExamEventListQuery,
  ): Promise<PaginatedResult<ExamEvent>> {
    const where = {
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
      ...(query.status ? { status: query.status } : {}),
    }
    const page = query.page ?? 1
    const limit = query.limit ?? 10
    const [total, rows] = await Promise.all([
      this.prisma.examEvent.count({ where }),
      this.prisma.examEvent.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    return { data: rows.map(toExamEvent), total, page, limit }
  }

  async listEventIdsSupervisedBy(userId: string, at: Date): Promise<string[]> {
    const rows = await this.prisma.examRoomSupervisor.findMany({
      where: {
        actualUserId: userId,
        startsAt: { lte: at },
        endsAt: { gt: at },
      },
      select: { room: { select: { eventId: true } } },
    })
    return [...new Set(rows.map((row) => row.room.eventId))]
  }

  async createRoom(input: NewExamRoom): Promise<ExamRoom> {
    try {
      const row = await this.prisma.examRoom.create({ data: input })
      return toExamRoom(row)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw conflictError(error)
      }
      throw error
    }
  }

  async updateRoom(id: string, edit: ExamRoomEdit): Promise<ExamRoom | null> {
    try {
      const row = await this.prisma.examRoom.update({
        where: { id },
        data: edit,
      })
      return toExamRoom(row)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') return null
        if (error.code === 'P2002') throw conflictError(error)
      }
      throw error
    }
  }

  async findRoomById(id: string): Promise<ExamRoom | null> {
    const row = await this.prisma.examRoom.findUnique({ where: { id } })
    return row ? toExamRoom(row) : null
  }

  async listRoomsByEvent(eventId: string): Promise<ExamRoom[]> {
    const rows = await this.prisma.examRoom.findMany({
      where: { eventId },
      orderBy: { code: 'asc' },
    })
    return rows.map(toExamRoom)
  }

  async listRoomsByEventStatus(status: ExamEventStatus): Promise<ExamRoom[]> {
    const rows = await this.prisma.examRoom.findMany({
      where: { event: { status } },
      orderBy: [{ eventId: 'asc' }, { code: 'asc' }],
    })
    return rows.map(toExamRoom)
  }

  async listRoomsByTechnician(userId: string): Promise<ExamRoom[]> {
    const rows = await this.prisma.examRoom.findMany({
      where: { technicianUserId: userId },
      orderBy: [{ eventId: 'asc' }, { code: 'asc' }],
    })
    return rows.map(toExamRoom)
  }

  async listRoomsSupervisedBy(userId: string): Promise<ExamRoom[]> {
    const rows = await this.prisma.examRoom.findMany({
      where: {
        supervisors: {
          some: {
            OR: [{ actualUserId: userId }, { scheduledUserId: userId }],
          },
        },
      },
      orderBy: [{ eventId: 'asc' }, { code: 'asc' }],
    })
    return rows.map(toExamRoom)
  }

  async rotateRoomToken(
    id: string,
    audit: NewExamSessionAuditLog,
  ): Promise<ExamRoom | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.examRoom.update({
          where: { id },
          data: { tokenRotation: { increment: 1 } },
        })
        await tx.examSessionAuditLog.create({
          data: {
            roomId: row.id,
            action: audit.action,
            actorId: audit.actorId,
            reason: audit.reason,
            metadata: (audit.metadata ?? {}) as Prisma.InputJsonValue,
          },
        })
        return toExamRoom(row)
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null
      }
      throw error
    }
  }

  async assignSeat(input: AssignSeatInput): Promise<ExamRoomSeat> {
    try {
      const row = await this.prisma.examRoomSeat.create({ data: input })
      return toExamRoomSeat(row)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw conflictError(error)
      }
      throw error
    }
  }

  async findSeat(
    eventId: string,
    studentId: string,
  ): Promise<ExamRoomSeat | null> {
    const row = await this.prisma.examRoomSeat.findUnique({
      where: { eventId_studentId: { eventId, studentId } },
    })
    return row ? toExamRoomSeat(row) : null
  }

  async findSeatForStudent(
    eventId: string,
    studentId: string,
  ): Promise<{ roomName: string; seatNumber: number } | null> {
    const row = await this.prisma.examRoomSeat.findFirst({
      where: { eventId, studentId },
      include: { room: true },
    })
    return row ? { roomName: row.room.name, seatNumber: row.seatNumber } : null
  }

  async listSeatsByRoom(roomId: string): Promise<ExamRoomSeat[]> {
    const rows = await this.prisma.examRoomSeat.findMany({
      where: { roomId },
      orderBy: { seatNumber: 'asc' },
    })
    return rows.map(toExamRoomSeat)
  }

  async listSeatsByEvent(eventId: string): Promise<ExamRoomSeat[]> {
    const rows = await this.prisma.examRoomSeat.findMany({ where: { eventId } })
    return rows.map(toExamRoomSeat)
  }

  async setSeatFlags(
    eventId: string,
    studentId: string,
    patch: SeatFlagsPatch,
  ): Promise<ExamRoomSeat | null> {
    try {
      const row = await this.prisma.examRoomSeat.update({
        where: { eventId_studentId: { eventId, studentId } },
        data: patch,
      })
      return toExamRoomSeat(row)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null
      }
      throw error
    }
  }

  setSeatFlagsWithAudit(
    eventId: string,
    studentId: string,
    patch: SeatFlagsPatch,
    audit: NewExamSessionAuditLog,
  ): Promise<ExamRoomSeat | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.examRoomSeat.findUnique({
        where: { eventId_studentId: { eventId, studentId } },
      })
      if (existing === null) return null
      const row = await tx.examRoomSeat.update({
        where: { eventId_studentId: { eventId, studentId } },
        data: patch,
      })
      await tx.examSessionAuditLog.create({
        data: {
          roomId: audit.roomId ?? null,
          action: audit.action,
          actorId: audit.actorId,
          reason: audit.reason,
          metadata: (audit.metadata ?? {}) as Prisma.InputJsonValue,
        },
      })
      return toExamRoomSeat(row)
    })
  }

  async removeSeat(roomId: string, studentId: string): Promise<boolean> {
    const result = await this.prisma.examRoomSeat.deleteMany({
      where: { roomId, studentId },
    })
    return result.count > 0
  }

  async autoDistributeSeats(
    input: AutoDistributeInput,
  ): Promise<AutoDistributeResult> {
    const rooms = await this.prisma.examRoom.findMany({
      where: { id: { in: input.roomIds }, eventId: input.eventId },
      orderBy: { code: 'asc' },
    })
    const ordered = input.interleaveByClassroom
      ? interleaveByClassroom(input.students)
      : [...input.students]

    return this.prisma.$transaction(async (tx) => {
      const assigned: ExamRoomSeat[] = []
      const unassigned: NewExamRoomSeat[] = []
      const used = new Map<string, Set<number>>()
      const counts = new Map<string, number>()
      for (const room of rooms) {
        const taken = await tx.examRoomSeat.findMany({
          where: { roomId: room.id },
          select: { seatNumber: true },
        })
        used.set(room.id, new Set(taken.map((row) => row.seatNumber)))
        counts.set(room.id, taken.length)
      }
      const seated = new Set(
        (
          await tx.examRoomSeat.findMany({
            where: { eventId: input.eventId },
            select: { studentId: true },
          })
        ).map((row) => row.studentId),
      )

      for (const student of ordered) {
        if (seated.has(student.studentId)) {
          unassigned.push(student)
          continue
        }
        seated.add(student.studentId)
        const room = rooms.find(
          (candidate) => (counts.get(candidate.id) ?? 0) < candidate.capacity,
        )
        if (room === undefined) {
          unassigned.push(student)
          continue
        }
        const taken = used.get(room.id) ?? new Set<number>()
        let seatNumber = 1
        while (taken.has(seatNumber)) seatNumber += 1
        taken.add(seatNumber)
        used.set(room.id, taken)
        counts.set(room.id, (counts.get(room.id) ?? 0) + 1)
        const row = await tx.examRoomSeat.create({
          data: {
            roomId: room.id,
            eventId: input.eventId,
            studentId: student.studentId,
            classroomId: student.classroomId,
            seatNumber,
          },
        })
        assigned.push(toExamRoomSeat(row))
      }
      return { assigned, unassigned }
    })
  }

  async assignSeats(inputs: AssignSeatInput[]): Promise<ExamRoomSeat[]> {
    if (inputs.length === 0) return []
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created: ExamRoomSeat[] = []
        for (const input of inputs) {
          const row = await tx.examRoomSeat.create({ data: input })
          created.push(toExamRoomSeat(row))
        }
        return created
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw conflictError(error)
      }
      throw error
    }
  }

  async assignSupervisor(
    input: NewExamRoomSupervisor,
  ): Promise<ExamRoomSupervisor> {
    const row = await this.prisma.examRoomSupervisor.create({
      data: { ...input, actualUserId: input.scheduledUserId },
    })
    return toExamRoomSupervisor(row)
  }

  async listSupervisors(roomId: string): Promise<ExamRoomSupervisor[]> {
    const rows = await this.prisma.examRoomSupervisor.findMany({
      where: { roomId },
      orderBy: { startsAt: 'asc' },
    })
    return rows.map(toExamRoomSupervisor)
  }

  async findSupervisorAt(
    roomId: string,
    at: Date,
  ): Promise<ExamRoomSupervisor | null> {
    const row = await this.prisma.examRoomSupervisor.findFirst({
      where: { roomId, startsAt: { lte: at }, endsAt: { gt: at } },
      orderBy: { startsAt: 'asc' },
    })
    return row ? toExamRoomSupervisor(row) : null
  }

  async findSupervisorById(slotId: string): Promise<ExamRoomSupervisor | null> {
    const row = await this.prisma.examRoomSupervisor.findUnique({
      where: { id: slotId },
    })
    return row ? toExamRoomSupervisor(row) : null
  }

  async findSupervisorSlotForUser(
    roomId: string,
    userId: string,
    at: Date,
  ): Promise<ExamRoomSupervisor | null> {
    const row = await this.prisma.examRoomSupervisor.findFirst({
      where: {
        roomId,
        actualUserId: userId,
        startsAt: { lte: at },
        endsAt: { gt: at },
      },
      orderBy: { startsAt: 'asc' },
    })
    return row ? toExamRoomSupervisor(row) : null
  }

  async substituteSupervisor(
    input: SupervisorSubstitution,
  ): Promise<ExamRoomSupervisor | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.examRoomSupervisor.update({
          where: { id: input.supervisorId },
          data: {
            actualUserId: input.actualUserId,
            substitutedByAdminId: input.substitutedByAdminId,
            substituteReason: input.reason,
            substitutedAt: input.at,
          },
        })
        await tx.examSessionAuditLog.create({
          data: {
            roomId: row.roomId,
            action: 'SUBSTITUTE_SUPERVISOR',
            actorId: input.substitutedByAdminId,
            reason: input.reason,
            metadata: {
              slotId: row.id,
              scheduledUserId: row.scheduledUserId,
              actualUserId: row.actualUserId,
            },
          },
        })
        return toExamRoomSupervisor(row)
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null
      }
      throw error
    }
  }

  async findReportBySlot(
    roomId: string,
    supervisorSlotId: string,
  ): Promise<ExamRoomReport | null> {
    const row = await this.prisma.examRoomReport.findFirst({
      where: { roomId, supervisorSlotId },
    })
    return row ? toExamRoomReport(row) : null
  }

  async createReport(input: NewExamRoomReport): Promise<ExamRoomReport> {
    try {
      const row = await this.prisma.examRoomReport.create({ data: input })
      return toExamRoomReport(row)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw conflictError(error)
      }
      throw error
    }
  }

  async saveReportDraft(
    reportId: string,
    draft: ExamRoomReportDraft,
  ): Promise<ExamRoomReport | null> {
    const { count } = await this.prisma.examRoomReport.updateMany({
      where: { id: reportId, status: 'DRAFT' },
      data: draft,
    })
    if (count === 0) return null
    const row = await this.prisma.examRoomReport.findUnique({
      where: { id: reportId },
    })
    return row ? toExamRoomReport(row) : null
  }

  async recordAbsence(
    input: NewExamRoomReportAbsence,
  ): Promise<ExamRoomReportAbsence | null> {
    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.examRoomReport.findFirst({
        where: { id: input.reportId, status: 'DRAFT' },
        select: { id: true },
      })
      if (parent === null) return null
      const row = await tx.examRoomReportAbsence.upsert({
        where: {
          reportId_studentId_scheduleId: {
            reportId: input.reportId,
            studentId: input.studentId,
            scheduleId: input.scheduleId,
          },
        },
        create: input,
        update: {
          reason: input.reason,
          note: input.note ?? null,
          recordedBy: input.recordedBy,
        },
      })
      return toExamRoomReportAbsence(row)
    })
  }

  async recordFieldNote(
    input: NewExamRoomFieldNote,
  ): Promise<ExamRoomFieldNote | null> {
    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.examRoomReport.findFirst({
        where: { id: input.reportId, status: 'DRAFT' },
        select: { id: true },
      })
      if (parent === null) return null
      const row = await tx.examRoomFieldNote.create({ data: input })
      return toExamRoomFieldNote(row)
    })
  }

  async submitReport(
    reportId: string,
    submittedByUserId: string,
    at: Date,
  ): Promise<ExamRoomReport | null> {
    const { count } = await this.prisma.examRoomReport.updateMany({
      where: { id: reportId, status: 'DRAFT' },
      data: { status: 'SUBMITTED', submittedByUserId, submittedAt: at },
    })
    if (count === 0) return null
    const row = await this.prisma.examRoomReport.findUnique({
      where: { id: reportId },
    })
    return row ? toExamRoomReport(row) : null
  }

  async listAbsencesByReport(
    reportId: string,
  ): Promise<ExamRoomReportAbsence[]> {
    const rows = await this.prisma.examRoomReportAbsence.findMany({
      where: { reportId },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    })
    return rows.map(toExamRoomReportAbsence)
  }

  async listFieldNotesByReport(reportId: string): Promise<ExamRoomFieldNote[]> {
    const rows = await this.prisma.examRoomFieldNote.findMany({
      where: { reportId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    })
    return rows.map(toExamRoomFieldNote)
  }

  async reopenReport(reportId: string): Promise<ExamRoomReport | null> {
    const { count } = await this.prisma.examRoomReport.updateMany({
      where: { id: reportId, status: { in: ['SUBMITTED', 'VERIFIED'] } },
      data: {
        status: 'DRAFT',
        submittedByUserId: null,
        submittedAt: null,
        verifiedByUserId: null,
        verifiedAt: null,
      },
    })
    if (count === 0) return null
    const row = await this.prisma.examRoomReport.findUnique({
      where: { id: reportId },
    })
    return row ? toExamRoomReport(row) : null
  }

  async verifyReport(
    reportId: string,
    verifiedByUserId: string,
    at: Date,
  ): Promise<ExamRoomReport | null> {
    const { count } = await this.prisma.examRoomReport.updateMany({
      where: { id: reportId, status: 'SUBMITTED' },
      data: { status: 'VERIFIED', verifiedByUserId, verifiedAt: at },
    })
    if (count === 0) return null
    const row = await this.prisma.examRoomReport.findUnique({
      where: { id: reportId },
    })
    return row ? toExamRoomReport(row) : null
  }

  async listAbsencesByScheduleStudent(
    scheduleId: string,
    studentId: string,
  ): Promise<ExamRoomReportAbsence[]> {
    const rows = await this.prisma.examRoomReportAbsence.findMany({
      where: { scheduleId, studentId },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    })
    return rows.map(toExamRoomReportAbsence)
  }

  async listAbsencesByScheduleStudents(
    scheduleId: string,
    studentIds: string[],
  ): Promise<ExamRoomReportAbsence[]> {
    if (studentIds.length === 0) return []
    const rows = await this.prisma.examRoomReportAbsence.findMany({
      where: { scheduleId, studentId: { in: studentIds } },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    })
    return rows.map(toExamRoomReportAbsence)
  }

  async recordSessionEvents(
    sessionId: string,
    events: NewExamSessionEvent[],
  ): Promise<ExamSessionEvent[]> {
    if (events.length === 0) return []
    await this.prisma.examSessionEvent.createMany({
      data: events.map((event) => ({ sessionId, ...event })),
      skipDuplicates: true,
    })
    const rows = await this.prisma.examSessionEvent.findMany({
      where: { sessionId, clientId: { in: events.map((e) => e.clientId) } },
      orderBy: { occurredAt: 'asc' },
    })
    return rows.map(toExamSessionEvent)
  }

  async listSessionEvents(sessionId: string): Promise<ExamSessionEvent[]> {
    const rows = await this.prisma.examSessionEvent.findMany({
      where: { sessionId },
      orderBy: { occurredAt: 'asc' },
    })
    return rows.map(toExamSessionEvent)
  }

  async listLatestSessionEvents(
    sessionIds: string[],
  ): Promise<ExamSessionEvent[]> {
    if (sessionIds.length === 0) return []
    const rows = await this.prisma.examSessionEvent.findMany({
      where: { sessionId: { in: sessionIds } },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    })
    const seen = new Set<string>()
    const latest: ExamSessionEvent[] = []
    for (const row of rows) {
      if (seen.has(row.sessionId)) continue
      seen.add(row.sessionId)
      latest.push(toExamSessionEvent(row))
    }
    return latest
  }

  async writeAuditLog(
    input: NewExamSessionAuditLog,
  ): Promise<ExamSessionAuditLog> {
    const row = await this.prisma.examSessionAuditLog.create({
      data: {
        sessionId: input.sessionId ?? null,
        roomId: input.roomId ?? null,
        scheduleId: input.scheduleId ?? null,
        action: input.action,
        actorId: input.actorId,
        reason: input.reason,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    })
    return toExamSessionAuditLog(row)
  }

  async listAuditLogs(sessionId: string): Promise<ExamSessionAuditLog[]> {
    const rows = await this.prisma.examSessionAuditLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toExamSessionAuditLog)
  }

  async listAuditLogsByRoom(roomId: string): Promise<ExamSessionAuditLog[]> {
    const rows = await this.prisma.examSessionAuditLog.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toExamSessionAuditLog)
  }
}
