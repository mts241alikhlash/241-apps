export const EXAM_TYPES = ['UH', 'QUIZ', 'ASSIGNMENT', 'UTS', 'UAS'] as const

export type ExamType = (typeof EXAM_TYPES)[number]

export const SCHEDULE_STATUSES = ['SCHEDULED', 'CANCELLED'] as const

export type ExamScheduleStatus = (typeof SCHEDULE_STATUSES)[number]

export const SCHEDULE_KINDS = ['REGULAR', 'MAKEUP'] as const

export type ExamScheduleKind = (typeof SCHEDULE_KINDS)[number]

export type SchedulePhase = 'CANCELLED' | 'UPCOMING' | 'RUNNING' | 'ENDED'

export interface ExamSchedule {
  id: string
  packageId: string
  packageTitle: string
  classroomId: string
  classroomName: string | null
  semesterId: string
  eventId: string | null
  type: ExamType
  kind: ExamScheduleKind
  makeupOfId: string | null
  startsAt: string
  endsAt: string
  durationMinutes: number
  status: ExamScheduleStatus
  hasSessions: boolean
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface SchedulePayload {
  type: ExamType
  startsAt: string
  endsAt: string
  durationMinutes: number
  eventId?: string | null
}

export interface ScheduleCreatePayload extends SchedulePayload {
  packageId: string
  classroomId: string
}

export interface ScheduleQueryParams {
  page?: number
  limit?: number
  classroomId?: string
  packageId?: string
  status?: ExamScheduleStatus
  from?: string
  to?: string
}

export interface AccessCode {
  accessCode: string
  rotation: number
}

export const SESSION_STATUSES = [
  'IN_PROGRESS',
  'SUBMITTED',
  'EXPIRED',
  'GRADED',
] as const

export type ExamSessionStatus = (typeof SESSION_STATUSES)[number]

export interface ScheduleSession {
  sessionId: string
  studentId: string
  studentName: string | null
  studentNis: string | null
  status: ExamSessionStatus
  startedAt: string
  submittedAt: string | null
  rawScore: number | null
  maxScore: number | null
  deviceBound: boolean
  violationCount: number
}

export const MAKEUP_REASONS = ['SICK', 'PERMITTED', 'ABSENT', 'OTHER'] as const

export type MakeupReason = (typeof MAKEUP_REASONS)[number]

export type MakeupRefusal = 'ALREADY_SAT' | 'IN_PROGRESS' | 'ON_LIVE_MAKEUP'

export interface Absentee {
  studentId: string
  name: string | null
  nis: string | null
  eligible: boolean
  reason: MakeupRefusal | null
  reportedReason: MakeupReason | null
  reportedNote: string | null
}

export interface MakeupParticipantInput {
  studentId: string
  reason: MakeupReason
  note?: string | null
}

export interface MakeupCreatePayload {
  packageId?: string
  startsAt: string
  endsAt: string
  durationMinutes: number
  participants: MakeupParticipantInput[]
}

export type ParticipantStatus =
  'WAITING' | 'SAT_REGULAR' | 'IN_PROGRESS' | 'DONE'

export interface MakeupParticipant {
  studentId: string
  name: string | null
  nis: string | null
  reason: MakeupReason
  note: string | null
  status: ParticipantStatus
}

export interface MakeupOrigin {
  id: string
  packageId: string
  packageTitle: string
  classroomName: string | null
  durationMinutes: number
  endsAt: string
}

export interface SessionAuditEntry {
  id: string
  sessionId: string | null
  roomId: string | null
  action: string
  actorId: string
  reason: string
  metadata: Record<string, unknown>
  createdAt: string
}
