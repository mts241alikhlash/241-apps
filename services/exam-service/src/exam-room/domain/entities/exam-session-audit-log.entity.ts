export const SESSION_AUDIT_ACTIONS = [
  'RELEASE_DEVICE',
  'REOPEN_SESSION',
  'RESET_SESSION',
  'EXTEND_TIME',
  'ALLOW_WEB_CLIENT',
  'ALLOW_LATE_ENTRY',
  'ROTATE_ROOM_TOKEN',
  'SUBSTITUTE_SUPERVISOR',
  'ASSIGN_SUPERVISOR',
  'SUBMIT_ROOM_REPORT',
  'VERIFY_ROOM_REPORT',
  'REOPEN_ROOM_REPORT',
  'CLOSED_BY_ADMIN',
] as const

export type SessionAuditAction = (typeof SESSION_AUDIT_ACTIONS)[number]

export interface ExamSessionAuditLog {
  id: string
  sessionId: string | null
  roomId: string | null
  scheduleId: string | null
  action: SessionAuditAction
  actorId: string
  reason: string
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface NewExamSessionAuditLog {
  sessionId?: string | null
  roomId?: string | null
  scheduleId?: string | null
  action: SessionAuditAction
  actorId: string
  reason: string
  metadata?: Record<string, unknown>
}
