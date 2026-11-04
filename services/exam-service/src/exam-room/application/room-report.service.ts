import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  ExamRoomFieldNote,
  ExamRoomReport,
  ExamRoomReportAbsence,
  ExamRoomReportDraft,
  NewExamRoomReportAbsence,
  NewExamRoomFieldNote,
} from '../domain/entities/exam-room-report.entity.js'
import type { ExamRoom } from '../domain/entities/exam-room.entity.js'
import type { ExamRoomSeat } from '../domain/entities/exam-room-seat.entity.js'
import type { ExamRoomSupervisor } from '../domain/entities/exam-room-supervisor.entity.js'
import type { ExamSessionAuditLog } from '../domain/entities/exam-session-audit-log.entity.js'
import { IExamRoomRepository } from '../domain/repositories/exam-room.repository.js'
import { IExamScheduleRepository } from '../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IExamSessionRepository } from '../../exam-session/domain/repositories/exam-session.repository.js'
import {
  MANAGE_ALL,
  RoomAccessService,
  type RoomStaffUser,
} from './room-access.service.js'

export interface ReportContext {
  room: ExamRoom
  slot: ExamRoomSupervisor
  report: ExamRoomReport
}

function reportLocked(): ConflictException {
  return new ConflictException({
    code: 'REPORT_LOCKED',
    message: 'Berita acara sudah diserahkan dan tidak bisa diubah',
  })
}

@Injectable()
export class RoomReportService {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly schedules: IExamScheduleRepository,
    private readonly sessions: IExamSessionRepository,
    private readonly access: RoomAccessService,
  ) {}

  async load(
    user: RoomStaffUser,
    roomId: string,
    slotId: string,
  ): Promise<ReportContext> {
    const slot = await this.slotOf(roomId, slotId)
    const room = await this.access.assertCanViewSlot(user, roomId, slot)
    const report = await this.ensureReport(roomId, slotId)
    return { room, slot, report }
  }

  async loadEditable(
    user: RoomStaffUser,
    roomId: string,
    slotId: string,
    now: Date,
  ): Promise<ReportContext> {
    const slot = await this.slotOf(roomId, slotId)
    const room = await this.access.assertCanWriteSlot(user, roomId, slot, now)
    const report = await this.ensureReport(roomId, slotId)
    if (report.status !== 'DRAFT') throw reportLocked()
    return { room, slot, report }
  }

  async loadVerifiable(
    user: RoomStaffUser,
    roomId: string,
    slotId: string,
  ): Promise<ReportContext> {
    const context = await this.load(user, roomId, slotId)
    if (!user.permissions?.includes(MANAGE_ALL)) {
      throw new ForbiddenException({
        code: 'REPORT_VERIFY_FORBIDDEN',
        message: 'Hanya koordinator yang boleh memverifikasi berita acara',
      })
    }
    if (context.report.status !== 'SUBMITTED') {
      throw new ConflictException({
        code: 'REPORT_NOT_SUBMITTED',
        message: 'Berita acara belum diserahkan pengawas',
      })
    }
    return context
  }

  async reopen(
    user: RoomStaffUser,
    roomId: string,
    slotId: string,
    _now: Date,
  ): Promise<ReportContext> {
    if (!user.permissions?.includes(MANAGE_ALL)) {
      const context = await this.load(user, roomId, slotId)
      if (context.report.status === 'DRAFT') return context
      throw reportLocked()
    }
    const context = await this.load(user, roomId, slotId)
    if (context.report.status === 'DRAFT') return context
    const reopened = await this.rooms.reopenReport(context.report.id)
    if (reopened === null) throw reportLocked()
    await this.audit(context, 'REOPEN_ROOM_REPORT', user.id, {
      previousStatus: context.report.status,
    })
    return { ...context, report: reopened }
  }

  async saveDraft(
    context: ReportContext,
    draft: ExamRoomReportDraft,
  ): Promise<ExamRoomReport> {
    const saved = await this.rooms.saveReportDraft(context.report.id, draft)
    if (saved === null) throw reportLocked()
    return saved
  }

  async submit(
    context: ReportContext,
    actorId: string,
    now: Date,
  ): Promise<ExamRoomReport> {
    const submitted = await this.rooms.submitReport(
      context.report.id,
      actorId,
      now,
    )
    if (submitted === null) throw reportLocked()
    await this.audit(context, 'SUBMIT_ROOM_REPORT', actorId, {
      condition: submitted.condition,
    })
    return submitted
  }

  async verify(
    context: ReportContext,
    actorId: string,
    now: Date,
  ): Promise<ExamRoomReport> {
    const verified = await this.rooms.verifyReport(
      context.report.id,
      actorId,
      now,
    )
    if (verified === null) {
      throw new ConflictException({
        code: 'REPORT_NOT_SUBMITTED',
        message: 'Berita acara belum diserahkan pengawas',
      })
    }
    await this.audit(context, 'VERIFY_ROOM_REPORT', actorId, {})
    return verified
  }

  async recordAbsence(
    context: ReportContext,
    input: Omit<NewExamRoomReportAbsence, 'reportId' | 'recordedBy'>,
    actorId: string,
  ): Promise<ExamRoomReportAbsence> {
    const seat = await this.assertSeated(context, input.studentId)
    const schedule = await this.assertSlotSchedule(context, input.scheduleId)
    if (schedule.classroomId !== seat.classroomId) {
      throw new NotFoundException('Jadwal tidak berjalan untuk kelas siswa ini')
    }
    if (
      (await this.sessions.findByScheduleAndStudent(
        schedule.id,
        seat.studentId,
      )) !== null
    ) {
      throw new ConflictException({
        code: 'SESSION_ALREADY_STARTED',
        message: 'Siswa sudah memulai ujian ini',
      })
    }
    const absence = await this.rooms.recordAbsence({
      ...input,
      reportId: context.report.id,
      recordedBy: actorId,
    })
    if (absence === null) throw reportLocked()
    return absence
  }

  async recordFieldNote(
    context: ReportContext,
    input: Omit<NewExamRoomFieldNote, 'reportId' | 'recordedBy'>,
    actorId: string,
  ): Promise<ExamRoomFieldNote> {
    await this.assertSeated(context, input.studentId)
    if (input.sessionId !== undefined && input.sessionId !== null) {
      const session = await this.sessions.findById(input.sessionId)
      if (session?.roomId !== context.room.id) {
        throw new NotFoundException('Sesi ujian tidak ditemukan di ruangan ini')
      }
    }
    const note = await this.rooms.recordFieldNote({
      ...input,
      reportId: context.report.id,
      recordedBy: actorId,
    })
    if (note === null) throw reportLocked()
    return note
  }

  async audit(
    context: ReportContext,
    action: 'SUBMIT_ROOM_REPORT' | 'VERIFY_ROOM_REPORT' | 'REOPEN_ROOM_REPORT',
    actorId: string,
    metadata: Record<string, unknown>,
  ): Promise<ExamSessionAuditLog> {
    return this.rooms.writeAuditLog({
      roomId: context.room.id,
      action,
      actorId,
      reason: `Berita acara ${context.slot.startsAt.toISOString()} - ${context.slot.endsAt.toISOString()}`,
      metadata: { reportId: context.report.id, ...metadata },
    })
  }

  private async slotOf(
    roomId: string,
    slotId: string,
  ): Promise<ExamRoomSupervisor> {
    const slot = await this.rooms.findSupervisorById(slotId)
    if (slot?.roomId !== roomId) {
      throw new NotFoundException('Jadwal pengawasan tidak ditemukan')
    }
    return slot
  }

  private async assertSeated(
    context: ReportContext,
    studentId: string,
  ): Promise<ExamRoomSeat> {
    const seats = await this.rooms.listSeatsByRoom(context.room.id)
    const seat = seats.find((row) => row.studentId === studentId)
    if (seat === undefined) {
      throw new NotFoundException('Siswa tidak terdaftar di ruangan ini')
    }
    return seat
  }

  private async assertSlotSchedule(context: ReportContext, scheduleId: string) {
    const schedules = await this.schedules.listSchedulesForEventWindow(
      context.room.eventId,
      context.slot.startsAt,
      context.slot.endsAt,
    )
    const schedule = schedules.find((row) => row.id === scheduleId)
    if (schedule === undefined) {
      throw new NotFoundException('Jadwal tidak berjalan pada jam ini')
    }
    return schedule
  }

  private async ensureReport(
    roomId: string,
    slotId: string,
  ): Promise<ExamRoomReport> {
    const existing = await this.rooms.findReportBySlot(roomId, slotId)
    if (existing !== null) return existing
    try {
      return await this.rooms.createReport({
        roomId,
        supervisorSlotId: slotId,
      })
    } catch {
      const raced = await this.rooms.findReportBySlot(roomId, slotId)
      if (raced === null)
        throw new NotFoundException('Berita acara tidak ditemukan')
      return raced
    }
  }
}
