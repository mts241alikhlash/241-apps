import { Injectable } from '@nestjs/common'
import type {
  ExamRoomFieldNote,
  ExamRoomReport,
  RoomExecutionCondition,
} from '../../../domain/entities/exam-room-report.entity.js'
import type { MakeupReason } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import type { RoomStaffUser } from '../../room-access.service.js'
import { RoomReportService } from '../../room-report.service.js'

export interface SaveRoomReportInput {
  condition?: RoomExecutionCondition
  incidentNotes?: string | null
  reopen?: boolean
}

export interface RecordAbsenceInput {
  studentId: string
  scheduleId: string
  reason: MakeupReason
  note?: string | null
}

export interface RecordFieldNoteInput {
  studentId: string
  sessionId?: string | null
  category: string
  note: string
}

@Injectable()
export class SaveRoomReportUseCase {
  constructor(private readonly reports: RoomReportService) {}

  async execute(
    user: RoomStaffUser,
    roomId: string,
    slotId: string,
    input: SaveRoomReportInput,
    now: Date = new Date(),
  ): Promise<ExamRoomReport> {
    const context =
      input.reopen === true
        ? await this.reports.reopen(user, roomId, slotId, now)
        : await this.reports.loadEditable(user, roomId, slotId, now)
    return this.reports.saveDraft(context, {
      condition: input.condition,
      incidentNotes: input.incidentNotes,
    })
  }

  async recordAbsence(
    user: RoomStaffUser,
    roomId: string,
    slotId: string,
    input: RecordAbsenceInput,
    now: Date = new Date(),
  ): Promise<ExamRoomReport> {
    const context = await this.reports.loadEditable(user, roomId, slotId, now)
    await this.reports.recordAbsence(
      context,
      {
        studentId: input.studentId,
        scheduleId: input.scheduleId,
        reason: input.reason,
        note: input.note ?? null,
      },
      user.id,
    )
    return context.report
  }

  async recordFieldNote(
    user: RoomStaffUser,
    roomId: string,
    slotId: string,
    input: RecordFieldNoteInput,
    now: Date = new Date(),
  ): Promise<ExamRoomFieldNote> {
    const context = await this.reports.loadEditable(user, roomId, slotId, now)
    return this.reports.recordFieldNote(
      context,
      {
        studentId: input.studentId,
        sessionId: input.sessionId ?? null,
        category: input.category,
        note: input.note,
      },
      user.id,
    )
  }
}
