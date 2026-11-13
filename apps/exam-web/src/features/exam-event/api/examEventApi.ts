import {
  unwrap,
  unwrapPage,
} from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'
import type {
  EventCreatePayload,
  EventQueryParams,
  EventUpdatePayload,
  RoomCreatePayload,
  RoomUpdatePayload,
  SeatAssignPayload,
} from '../types'

const roomPath = (roomId: string) => ({ params: { path: { roomId } } })

export const examEventApi = {
  getEvents: (query?: EventQueryParams) =>
    unwrapPage(examClient.GET('/exam-events', { params: { query } })),

  getEvent: (id: string) =>
    unwrap(examClient.GET('/exam-events/{id}', { params: { path: { id } } })),

  createEvent: (body: EventCreatePayload) =>
    unwrap(examClient.POST('/exam-events', { body })),

  updateEvent: (id: string, body: EventUpdatePayload) =>
    unwrap(
      examClient.PATCH('/exam-events/{id}', {
        params: { path: { id } },
        body,
      }),
    ),

  getRooms: (id: string) =>
    unwrap(
      examClient.GET('/exam-events/{id}/rooms', { params: { path: { id } } }),
    ),

  createRoom: (id: string, body: RoomCreatePayload) =>
    unwrap(
      examClient.POST('/exam-events/{id}/rooms', {
        params: { path: { id } },
        body,
      }),
    ),

  updateRoom: (roomId: string, body: RoomUpdatePayload) =>
    unwrap(
      examClient.PATCH('/exam-rooms/{roomId}', { ...roomPath(roomId), body }),
    ),

  getSeats: (roomId: string) =>
    unwrap(examClient.GET('/exam-rooms/{roomId}/seats', roomPath(roomId))),

  assignSeats: (roomId: string, students: SeatAssignPayload[]) =>
    unwrap(
      examClient.POST('/exam-rooms/{roomId}/seats', {
        ...roomPath(roomId),
        body: { students },
      }),
    ),

  distributeSeats: (
    roomId: string,
    body: {
      students: SeatAssignPayload[]
      roomIds: string[]
      interleaveByClassroom: boolean
    },
  ) =>
    unwrap(
      examClient.POST('/exam-rooms/{roomId}/seats', {
        ...roomPath(roomId),
        body,
      }),
    ),

  getSupervisors: (roomId: string) =>
    unwrap(
      examClient.GET('/exam-rooms/{roomId}/supervisors', roomPath(roomId)),
    ),

  substituteSupervisor: (
    roomId: string,
    slotId: string,
    body: { actualUserId: string; reason: string },
  ) =>
    unwrap(
      examClient.POST('/exam-rooms/{roomId}/supervisors/{slotId}/substitute', {
        params: { path: { roomId, slotId } },
        body,
      }),
    ),

  getAccessCode: (roomId: string) =>
    unwrap(
      examClient.GET('/exam-rooms/{roomId}/access-code', roomPath(roomId)),
    ),

  rotateToken: (roomId: string, body: { reason: string }) =>
    unwrap(
      examClient.POST('/exam-rooms/{roomId}/rotate-token', {
        ...roomPath(roomId),
        body,
      }),
    ),

  getAuditLogs: (roomId: string) =>
    unwrap(examClient.GET('/exam-rooms/{roomId}/audit-logs', roomPath(roomId))),

  assignSupervisor: (
    roomId: string,
    body: {
      scheduledUserId: string
      startsAt: string
      endsAt: string
      reason: string
    },
  ) =>
    unwrap(
      examClient.POST('/exam-rooms/{roomId}/supervisors', {
        ...roomPath(roomId),
        body,
      }),
    ),

  extendRoomTime: (roomId: string, body: { minutes: number; reason: string }) =>
    unwrap(
      examClient.POST('/exam-rooms/{roomId}/extend-time', {
        ...roomPath(roomId),
        body,
      }),
    ),

  allowLate: (roomId: string, studentId: string, body: { reason: string }) =>
    unwrap(
      examClient.POST('/exam-rooms/{roomId}/seats/{studentId}/allow-late', {
        params: { path: { roomId, studentId } },
        body,
      }),
    ),
}
