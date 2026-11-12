import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  Letterhead,
  RoomAbsencePayload,
  RoomFieldNotePayload,
  RoomMonitorMeta,
  RoomMonitorParticipant,
  RoomMonitorQuery,
  RoomOverview,
  RoomReport,
  RoomReportPayload,
  SessionTimelineEntry,
  SupervisorSlotRow,
} from '../types'

const seg = encodeURIComponent

const room = (roomId: string) => `/exam-rooms/${seg(roomId)}`

const report = (roomId: string, slotId: string) =>
  `${room(roomId)}/reports/${seg(slotId)}`

export const examRoomApi = {
  getOverview: (params?: { eventId?: string }) =>
    api.get<ApiSingleResponse<RoomOverview[]>>('/exam-rooms/overview', {
      params,
    }),

  getMonitor: (roomId: string, params?: RoomMonitorQuery) =>
    api.get<ApiPaginatedResponse<RoomMonitorParticipant, RoomMonitorMeta>>(
      `${room(roomId)}/monitor`,
      { params },
    ),

  getSupervisors: (roomId: string) =>
    api.get<ApiSingleResponse<SupervisorSlotRow[]>>(
      `${room(roomId)}/supervisors`,
    ),

  getTimeline: (sessionId: string) =>
    api.get<ApiSingleResponse<SessionTimelineEntry[]>>(
      `/exam-sessions/${seg(sessionId)}/timeline`,
    ),

  releaseSession: (sessionId: string, reason: string) =>
    api.post(`/exam-sessions/${seg(sessionId)}/release`, { reason }),

  reopenSession: (sessionId: string, reason: string) =>
    api.post(`/exam-sessions/${seg(sessionId)}/reopen`, { reason }),

  resetSession: (sessionId: string, reason: string) =>
    api.post(`/exam-sessions/${seg(sessionId)}/reset`, { reason }),

  extendSessionTime: (sessionId: string, minutes: number, reason: string) =>
    api.post(`/exam-sessions/${seg(sessionId)}/extend-time`, {
      minutes,
      reason,
    }),

  allowWeb: (roomId: string, studentId: string, reason: string) =>
    api.post(`${room(roomId)}/seats/${seg(studentId)}/allow-web`, { reason }),

  allowLate: (roomId: string, studentId: string, reason: string) =>
    api.post(`${room(roomId)}/seats/${seg(studentId)}/allow-late`, { reason }),

  getReport: (roomId: string, slotId: string) =>
    api.get<ApiSingleResponse<RoomReport>>(report(roomId, slotId)),

  saveReport: (roomId: string, slotId: string, payload: RoomReportPayload) =>
    api.put<ApiSingleResponse<RoomReport>>(report(roomId, slotId), payload),

  recordAbsence: (
    roomId: string,
    slotId: string,
    payload: RoomAbsencePayload,
  ) =>
    api.post<ApiSingleResponse<RoomReport>>(
      `${report(roomId, slotId)}/absences`,
      payload,
    ),

  recordFieldNote: (
    roomId: string,
    slotId: string,
    payload: RoomFieldNotePayload,
  ) =>
    api.post<ApiSingleResponse<RoomReport>>(
      `${report(roomId, slotId)}/field-notes`,
      payload,
    ),

  submitReport: (roomId: string, slotId: string) =>
    api.post<ApiSingleResponse<RoomReport>>(`${report(roomId, slotId)}/submit`),

  verifyReport: (roomId: string, slotId: string) =>
    api.post<ApiSingleResponse<RoomReport>>(`${report(roomId, slotId)}/verify`),

  getLetterhead: () =>
    api.get<ApiSingleResponse<Letterhead>>('/school-units/letterhead'),
}
