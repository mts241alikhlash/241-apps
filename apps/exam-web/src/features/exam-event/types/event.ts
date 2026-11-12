import type { components } from '@mts241alikhlash/exam-api'
import type { ExamCategory, ExamType } from '@/features/exam-shared/examType'

type Schemas = components['schemas']

export const EVENT_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED'] as const

export type ExamEventStatus = Schemas['ExamEventDto']['status']

export interface ExamEvent {
  id: string
  semesterId: string
  name: string
  type: ExamType
  category?: ExamCategory
  startsAt: string
  endsAt: string
  lateToleranceMinutes: number
  minSubmitMinutes: number
  requireAndroidApp: boolean
  status: ExamEventStatus
}

export type EventCreatePayload = Schemas['CreateExamEventDto']

export type EventUpdatePayload = Schemas['UpdateExamEventDto']

export interface EventQueryParams {
  page?: number
  limit?: number
  semesterId?: string
  status?: ExamEventStatus
}

export interface ExamRoom {
  id: string
  eventId: string
  code: string
  name: string
  building: string | null
  capacity: number
  technicianUserId: string | null
  tokenRotation: number
}

export interface RoomCreatePayload {
  code: string
  name: string
  building?: string | null
  capacity: number
  technicianUserId?: string | null
}

export type RoomUpdatePayload = Partial<RoomCreatePayload>

export interface RoomSeat {
  studentId: string
  classroomId: string
  seatNumber: number
}

export interface SeatAssignPayload {
  studentId: string
  classroomId: string
  seatNumber?: number
}

export interface SupervisorSlot {
  slotId: string
  roomId: string
  scheduledUserId: string
  actualUserId: string
  startsAt: string
  endsAt: string
}

export interface RoomAccessCode {
  accessCode: string
  rotation: number
  expiresAt: string
}

export interface SeatFlag {
  studentId: string
  allowWebClient: boolean
  allowLateEntry: boolean
}

export interface UserOption {
  id: string
  identifier: string
}

export interface AuditLogEntry {
  id: string
  sessionId: string | null
  roomId: string | null
  action: string
  actorId: string
  reason: string
  metadata: Record<string, unknown>
  createdAt: string
}
