export const SESSION_EVENT_TYPES = [
  'PERMISSION_DIALOG',
  'SCREEN_OFF',
  'FOCUS_LOST_BRIEF',
  'OVERLAY_OR_SHADE',
  'CALL_OR_MIC_ACTIVE',
  'SCREEN_SHARE_DETECTED',
  'LEFT_APP',
  'VIOLATION_LOCKED',
  'CALL_SUSPENDED',
] as const

export type SessionEventType = (typeof SESSION_EVENT_TYPES)[number]

export interface ExamSessionEvent {
  id: string
  sessionId: string
  clientId: string
  type: SessionEventType
  isViolation: boolean
  detail: string | null
  occurredAt: Date
  createdAt: Date
}

export interface NewExamSessionEvent {
  clientId: string
  type: SessionEventType
  isViolation: boolean
  detail: string | null
  occurredAt: Date
}
