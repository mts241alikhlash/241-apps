import {
  unwrap,
  unwrapPage,
} from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient, identityClient } from '@/shared/api/clients'
import type {
  RoomAbsencePayload,
  RoomFieldNotePayload,
  RoomMonitorQuery,
  RoomReportPayload,
} from '../types'

const reportPath = (roomId: string, slotId: string) => ({
  params: { path: { roomId, slotId } },
})

export const examRoomApi = {
  getOverview: (query?: { eventId?: string }) =>
    unwrap(examClient.GET('/exam-rooms/overview', { params: { query } })),

  getMonitor: (roomId: string, query?: RoomMonitorQuery) =>
    unwrapPage(
      examClient.GET('/exam-rooms/{roomId}/monitor', {
        params: { path: { roomId }, query },
      }),
    ),

  getSupervisors: (roomId: string) =>
    unwrap(
      examClient.GET('/exam-rooms/{roomId}/supervisors', {
        params: { path: { roomId } },
      }),
    ),

  getTimeline: (id: string) =>
    unwrap(
      examClient.GET('/exam-sessions/{id}/timeline', {
        params: { path: { id } },
      }),
    ),

  releaseSession: (id: string, reason: string) =>
    unwrap(
      examClient.POST('/exam-sessions/{id}/release', {
        params: { path: { id } },
        body: { reason },
      }),
    ),

  reopenSession: (id: string, reason: string) =>
    unwrap(
      examClient.POST('/exam-sessions/{id}/reopen', {
        params: { path: { id } },
        body: { reason },
      }),
    ),

  resetSession: (id: string, reason: string) =>
    unwrap(
      examClient.POST('/exam-sessions/{id}/reset', {
        params: { path: { id } },
        body: { reason },
      }),
    ),

  extendSessionTime: (id: string, minutes: number, reason: string) =>
    unwrap(
      examClient.POST('/exam-sessions/{id}/extend-time', {
        params: { path: { id } },
        body: { minutes, reason },
      }),
    ),

  allowLate: (roomId: string, studentId: string, reason: string) =>
    unwrap(
      examClient.POST('/exam-rooms/{roomId}/seats/{studentId}/allow-late', {
        params: { path: { roomId, studentId } },
        body: { reason },
      }),
    ),

  getReport: (roomId: string, slotId: string) =>
    unwrap(
      examClient.GET(
        '/exam-rooms/{roomId}/reports/{slotId}',
        reportPath(roomId, slotId),
      ),
    ),

  saveReport: (roomId: string, slotId: string, body: RoomReportPayload) =>
    unwrap(
      examClient.PUT('/exam-rooms/{roomId}/reports/{slotId}', {
        ...reportPath(roomId, slotId),
        body,
      }),
    ),

  recordAbsence: (roomId: string, slotId: string, body: RoomAbsencePayload) =>
    unwrap(
      examClient.POST('/exam-rooms/{roomId}/reports/{slotId}/absences', {
        ...reportPath(roomId, slotId),
        body,
      }),
    ),

  recordFieldNote: (
    roomId: string,
    slotId: string,
    body: RoomFieldNotePayload,
  ) =>
    unwrap(
      examClient.POST('/exam-rooms/{roomId}/reports/{slotId}/field-notes', {
        ...reportPath(roomId, slotId),
        body,
      }),
    ),

  submitReport: (roomId: string, slotId: string) =>
    unwrap(
      examClient.POST(
        '/exam-rooms/{roomId}/reports/{slotId}/submit',
        reportPath(roomId, slotId),
      ),
    ),

  verifyReport: (roomId: string, slotId: string) =>
    unwrap(
      examClient.POST(
        '/exam-rooms/{roomId}/reports/{slotId}/verify',
        reportPath(roomId, slotId),
      ),
    ),

  getLetterhead: () => unwrap(identityClient.GET('/school-units/letterhead')),
}
