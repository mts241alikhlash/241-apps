import {
  unwrap,
  unwrapPage,
} from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'
import type {
  MakeupCreatePayload,
  MakeupParticipantInput,
  ScheduleCreatePayload,
  SchedulePayload,
  ScheduleQueryParams,
} from '../types'

const idPath = (id: string) => ({ params: { path: { id } } })

export const examScheduleApi = {
  getSchedules: (query?: ScheduleQueryParams) =>
    unwrapPage(examClient.GET('/exam-schedules', { params: { query } })),

  getSchedule: (id: string) =>
    unwrap(examClient.GET('/exam-schedules/{id}', idPath(id))),

  createSchedule: (body: ScheduleCreatePayload) =>
    unwrap(examClient.POST('/exam-schedules', { body })),

  updateSchedule: (id: string, body: SchedulePayload) =>
    unwrap(examClient.PATCH('/exam-schedules/{id}', { ...idPath(id), body })),

  cancelSchedule: (id: string) =>
    unwrap(examClient.POST('/exam-schedules/{id}/cancel', idPath(id))),

  getAccessCode: (id: string) =>
    unwrap(examClient.GET('/exam-schedules/{id}/access-code', idPath(id))),

  getSessions: (id: string, query?: { page?: number; limit?: number }) =>
    unwrapPage(
      examClient.GET('/exam-schedules/{id}/sessions', {
        params: { path: { id }, query },
      }),
    ),

  releaseSession: (id: string, reason: string) =>
    unwrap(
      examClient.POST('/exam-sessions/{id}/release', {
        ...idPath(id),
        body: { reason },
      }),
    ),

  resetSession: (id: string, reason: string) =>
    unwrap(
      examClient.POST('/exam-sessions/{id}/reset', {
        ...idPath(id),
        body: { reason },
      }),
    ),

  getSessionAuditLogs: (id: string) =>
    unwrap(examClient.GET('/exam-sessions/{id}/audit-logs', idPath(id))),

  getAbsentees: (id: string) =>
    unwrap(examClient.GET('/exam-schedules/{id}/absentees', idPath(id))),

  createMakeup: (id: string, body: MakeupCreatePayload) =>
    unwrap(
      examClient.POST('/exam-schedules/{id}/makeups', { ...idPath(id), body }),
    ),

  getParticipants: (id: string) =>
    unwrap(examClient.GET('/exam-schedules/{id}/participants', idPath(id))),

  addParticipants: (id: string, participants: MakeupParticipantInput[]) =>
    unwrap(
      examClient.POST('/exam-schedules/{id}/participants', {
        ...idPath(id),
        body: { participants },
      }),
    ),

  removeParticipant: (id: string, studentId: string) =>
    unwrap(
      examClient.DELETE('/exam-schedules/{id}/participants/{studentId}', {
        params: { path: { id, studentId } },
      }),
    ),

  rotateAccessCode: (id: string) =>
    unwrap(
      examClient.POST('/exam-schedules/{id}/access-code/rotate', idPath(id)),
    ),
}
