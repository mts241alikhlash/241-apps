import type { MakeupReason } from '../../../exam-schedule/domain/entities/exam-schedule.entity.js'

export const ROOM_REPORT_STATUSES = ['DRAFT', 'SUBMITTED', 'VERIFIED'] as const

export type RoomReportStatus = (typeof ROOM_REPORT_STATUSES)[number]

export const ROOM_EXECUTION_CONDITIONS = [
  'SMOOTH',
  'TECHNICAL_ISSUE',
  'DISCIPLINARY_NOTE',
] as const

export type RoomExecutionCondition = (typeof ROOM_EXECUTION_CONDITIONS)[number]

export interface ExamRoomReport {
  id: string
  roomId: string
  supervisorSlotId: string
  condition: RoomExecutionCondition
  incidentNotes: string | null
  submittedByUserId: string | null
  submittedAt: Date | null
  verifiedByUserId: string | null
  verifiedAt: Date | null
  status: RoomReportStatus
  createdAt: Date
  updatedAt: Date
}

export interface NewExamRoomReport {
  roomId: string
  supervisorSlotId: string
  condition?: RoomExecutionCondition
  incidentNotes?: string | null
}

export interface ExamRoomReportDraft {
  condition?: RoomExecutionCondition
  incidentNotes?: string | null
}

export interface ExamRoomReportAbsence {
  id: string
  reportId: string
  studentId: string
  scheduleId: string
  reason: MakeupReason
  note: string | null
  recordedBy: string
  updatedAt: Date
}

export interface NewExamRoomReportAbsence {
  reportId: string
  studentId: string
  scheduleId: string
  reason: MakeupReason
  note?: string | null
  recordedBy: string
}

export interface ExamRoomFieldNote {
  id: string
  reportId: string
  studentId: string
  sessionId: string | null
  category: string
  note: string
  recordedBy: string
  createdAt: Date
}

export interface NewExamRoomFieldNote {
  reportId: string
  studentId: string
  sessionId?: string | null
  category: string
  note: string
  recordedBy: string
}
