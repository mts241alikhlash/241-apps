import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  AccessCode,
  Absentee,
  ExamSchedule,
  MakeupCreatePayload,
  MakeupParticipant,
  MakeupParticipantInput,
  ScheduleCreatePayload,
  SchedulePayload,
  ScheduleQueryParams,
  ScheduleSession,
  SessionAuditEntry,
} from '../types'

const seg = encodeURIComponent

export const examScheduleApi = {
  getSchedules: (params?: ScheduleQueryParams) =>
    api.get<ApiPaginatedResponse<ExamSchedule>>('/exam-schedules', { params }),

  getSchedule: (id: string) =>
    api.get<ApiSingleResponse<ExamSchedule>>(`/exam-schedules/${seg(id)}`),

  createSchedule: (payload: ScheduleCreatePayload) =>
    api.post<ApiSingleResponse<ExamSchedule>>('/exam-schedules', payload),

  updateSchedule: (id: string, payload: SchedulePayload) =>
    api.patch<ApiSingleResponse<ExamSchedule>>(
      `/exam-schedules/${seg(id)}`,
      payload,
    ),

  cancelSchedule: (id: string) => api.post(`/exam-schedules/${seg(id)}/cancel`),

  getAccessCode: (id: string) =>
    api.get<ApiSingleResponse<AccessCode>>(
      `/exam-schedules/${seg(id)}/access-code`,
    ),

  getSessions: (id: string, params?: { page?: number; limit?: number }) =>
    api.get<ApiPaginatedResponse<ScheduleSession>>(
      `/exam-schedules/${seg(id)}/sessions`,
      { params },
    ),

  releaseSession: (sessionId: string, reason: string) =>
    api.post(`/exam-sessions/${seg(sessionId)}/release`, { reason }),

  resetSession: (sessionId: string, reason: string) =>
    api.post(`/exam-sessions/${seg(sessionId)}/reset`, { reason }),

  getSessionAuditLogs: (sessionId: string) =>
    api.get<ApiSingleResponse<SessionAuditEntry[]>>(
      `/exam-sessions/${seg(sessionId)}/audit-logs`,
    ),

  getAbsentees: (id: string) =>
    api.get<ApiSingleResponse<Absentee[]>>(
      `/exam-schedules/${seg(id)}/absentees`,
    ),

  createMakeup: (id: string, payload: MakeupCreatePayload) =>
    api.post<ApiSingleResponse<ExamSchedule>>(
      `/exam-schedules/${seg(id)}/makeups`,
      payload,
    ),

  getParticipants: (id: string) =>
    api.get<ApiSingleResponse<MakeupParticipant[]>>(
      `/exam-schedules/${seg(id)}/participants`,
    ),

  addParticipants: (id: string, participants: MakeupParticipantInput[]) =>
    api.post(`/exam-schedules/${seg(id)}/participants`, { participants }),

  removeParticipant: (id: string, studentId: string) =>
    api.delete(`/exam-schedules/${seg(id)}/participants/${seg(studentId)}`),

  rotateAccessCode: (id: string) =>
    api.post<ApiSingleResponse<AccessCode>>(
      `/exam-schedules/${seg(id)}/access-code/rotate`,
    ),
}
