import type { components } from '@mts241alikhlash/exam-api'

type Schemas = components['schemas']

export const EVENT_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED'] as const

export type ExamEventStatus = Schemas['ExamEventDto']['status']

export type ExamEvent = Schemas['ExamEventDto']

export type EventCreatePayload = Schemas['CreateExamEventDto']

export type EventUpdatePayload = Schemas['UpdateExamEventDto']

export interface EventQueryParams {
  page?: number
  limit?: number
  semesterId?: string
  status?: ExamEventStatus
}

export type ExamRoom = Schemas['ExamRoomDto']

export type RoomCreatePayload = Schemas['CreateExamRoomDto']

export type RoomUpdatePayload = Schemas['UpdateExamRoomDto']

export type RoomSeat = Schemas['ExamRoomSeatDto']

export type SeatAssignPayload = Schemas['ExamRoomSeatDto']

export type SupervisorSlot = Schemas['SupervisorSlotDto']

export type RoomAccessCode = Schemas['RoomAccessCodeDto']

export type SeatFlag = Schemas['SeatFlagDto']

export interface UserOption {
  id: string
  identifier: string
}

export type AuditLogEntry = Schemas['AuditLogDto']
