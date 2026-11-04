import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  EventCreatePayload,
  EventQueryParams,
  EventUpdatePayload,
  ExamEvent,
  ExamRoom,
  RoomAccessCode,
  RoomCreatePayload,
  RoomSeat,
  RoomUpdatePayload,
  SeatAssignPayload,
  SeatFlag,
  SupervisorSlot,
  UserOption,
  AuditLogEntry,
} from '../types'

const seg = encodeURIComponent

const room = (roomId: string) => `/exam-rooms/${seg(roomId)}`

export const examEventApi = {
  getEvents: (params?: EventQueryParams) =>
    api.get<ApiPaginatedResponse<ExamEvent>>('/exam-events', { params }),

  getEvent: (id: string) =>
    api.get<ApiSingleResponse<ExamEvent>>(`/exam-events/${seg(id)}`),

  createEvent: (payload: EventCreatePayload) =>
    api.post<ApiSingleResponse<ExamEvent>>('/exam-events', payload),

  updateEvent: (id: string, payload: EventUpdatePayload) =>
    api.patch<ApiSingleResponse<ExamEvent>>(`/exam-events/${seg(id)}`, payload),

  getRooms: (eventId: string) =>
    api.get<ApiSingleResponse<ExamRoom[]>>(
      `/exam-events/${seg(eventId)}/rooms`,
    ),

  createRoom: (eventId: string, payload: RoomCreatePayload) =>
    api.post<ApiSingleResponse<ExamRoom>>(
      `/exam-events/${seg(eventId)}/rooms`,
      payload,
    ),

  updateRoom: (roomId: string, payload: RoomUpdatePayload) =>
    api.patch<ApiSingleResponse<ExamRoom>>(room(roomId), payload),

  getSeats: (roomId: string) =>
    api.get<ApiSingleResponse<RoomSeat[]>>(`${room(roomId)}/seats`),

  assignSeats: (roomId: string, students: SeatAssignPayload[]) =>
    api.post<ApiSingleResponse<RoomSeat[]>>(`${room(roomId)}/seats`, {
      students,
    }),

  distributeSeats: (
    roomId: string,
    payload: {
      students: SeatAssignPayload[]
      roomIds: string[]
      interleaveByClassroom: boolean
    },
  ) =>
    api.post<ApiSingleResponse<RoomSeat[]>>(`${room(roomId)}/seats`, payload),

  getSupervisors: (roomId: string) =>
    api.get<ApiSingleResponse<SupervisorSlot[]>>(`${room(roomId)}/supervisors`),

  substituteSupervisor: (
    roomId: string,
    slotId: string,
    payload: { actualUserId: string; reason: string },
  ) =>
    api.post<ApiSingleResponse<SupervisorSlot>>(
      `${room(roomId)}/supervisors/${seg(slotId)}/substitute`,
      payload,
    ),

  getAccessCode: (roomId: string) =>
    api.get<ApiSingleResponse<RoomAccessCode>>(`${room(roomId)}/access-code`),

  rotateToken: (roomId: string, payload: { reason: string }) =>
    api.post<ApiSingleResponse<RoomAccessCode>>(
      `${room(roomId)}/rotate-token`,
      payload,
    ),

  getAuditLogs: (roomId: string) =>
    api.get<ApiSingleResponse<AuditLogEntry[]>>(`${room(roomId)}/audit-logs`),

  assignSupervisor: (
    roomId: string,
    payload: {
      scheduledUserId: string
      startsAt: string
      endsAt: string
      reason: string
    },
  ) =>
    api.post<ApiSingleResponse<SupervisorSlot>>(
      `${room(roomId)}/supervisors`,
      payload,
    ),

  extendRoomTime: (
    roomId: string,
    payload: { minutes: number; reason: string },
  ) =>
    api.post<ApiSingleResponse<unknown>>(
      `${room(roomId)}/extend-time`,
      payload,
    ),

  allowWeb: (roomId: string, studentId: string, payload: { reason: string }) =>
    api.post<ApiSingleResponse<SeatFlag>>(
      `${room(roomId)}/seats/${seg(studentId)}/allow-web`,
      payload,
    ),

  allowLate: (roomId: string, studentId: string, payload: { reason: string }) =>
    api.post<ApiSingleResponse<SeatFlag>>(
      `${room(roomId)}/seats/${seg(studentId)}/allow-late`,
      payload,
    ),

  getUsers: (params?: { roleCode?: string; search?: string; limit?: number }) =>
    api.get<ApiPaginatedResponse<UserOption>>('/users', { params }),
}
