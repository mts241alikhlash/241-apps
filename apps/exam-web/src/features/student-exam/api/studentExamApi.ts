import { unwrap } from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'
import type { SebProof } from '@/shared/seb'
import type { SaveAnswersBatchRequest, SubmitRequest } from '../types'

const deviceHeaders = (deviceId: string) => ({
  'X-Device-Id': deviceId,
  'X-Client-Platform': 'web',
})

export const studentExamApi = {
  listExams: () => unwrap(examClient.GET('/me/exams')),

  startSession: (
    scheduleId: string,
    accessCode: string,
    deviceId: string,
    seb?: SebProof,
  ) =>
    unwrap(
      examClient.POST('/me/exams/{scheduleId}/sessions', {
        params: { path: { scheduleId } },
        body: { accessCode, deviceId, seb },
        headers: { 'X-Client-Platform': 'web' },
      }),
    ),

  activeSebConfigs: () => unwrap(examClient.GET('/seb-configs/active')),

  resume: (
    sessionId: string,
    deviceId: string,
    accessCode: string,
    seb?: SebProof,
  ) =>
    unwrap(
      examClient.POST('/student-exams/{sessionId}/resume', {
        params: { path: { sessionId }, header: deviceHeaders(deviceId) },
        body: { accessCode, deviceId, seb },
      }),
    ),

  heartbeat: (sessionId: string, deviceId: string) =>
    unwrap(
      examClient.POST('/student-exams/{sessionId}/heartbeat', {
        params: { path: { sessionId }, header: deviceHeaders(deviceId) },
      }),
    ),

  getQuestions: (sessionId: string, deviceId: string) =>
    unwrap(
      examClient.GET('/student-exams/{sessionId}/questions', {
        params: { path: { sessionId }, header: deviceHeaders(deviceId) },
      }),
    ),

  getAnswers: (sessionId: string, deviceId: string) =>
    unwrap(
      examClient.GET('/student-exams/{sessionId}/answers', {
        params: { path: { sessionId }, header: deviceHeaders(deviceId) },
      }),
    ),

  saveAnswersBatch: (
    sessionId: string,
    deviceId: string,
    body: SaveAnswersBatchRequest,
  ) =>
    unwrap(
      examClient.POST('/student-exams/{sessionId}/answers/batch', {
        params: { path: { sessionId }, header: deviceHeaders(deviceId) },
        body,
      }),
    ),

  submit: (sessionId: string, deviceId: string, body: SubmitRequest = {}) =>
    unwrap(
      examClient.POST('/student-exams/{sessionId}/submit', {
        params: { path: { sessionId }, header: deviceHeaders(deviceId) },
        body,
      }),
    ),
}
