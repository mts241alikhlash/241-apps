import api from '@mts241alikhlash/web-shared/utils/api'
import type { ApiEnvelope } from '@mts241alikhlash/web-shared/types/api'
import type {
  MyExam,
  SaveAnswersBatchRequest,
  SaveAnswersBatchResult,
  SavedAnswer,
  SessionPaper,
  StartedSession,
  SubmitRequest,
  SubmittedSession,
} from '../types'

const seg = encodeURIComponent

const deviceHeaders = (deviceId: string) => ({
  'X-Device-Id': deviceId,
  'X-Client-Platform': 'web',
})

export const studentExamApi = {
  listExams: () => api.get<ApiEnvelope<MyExam[]>>('/me/exams'),

  startSession: (scheduleId: string, accessCode: string, deviceId: string) =>
    api.post<ApiEnvelope<StartedSession>>(
      `/me/exams/${seg(scheduleId)}/sessions`,
      { accessCode, deviceId },
      { headers: { 'X-Client-Platform': 'web' } },
    ),

  getQuestions: (sessionId: string, deviceId: string) =>
    api.get<ApiEnvelope<SessionPaper>>(
      `/student-exams/${seg(sessionId)}/questions`,
      { headers: deviceHeaders(deviceId) },
    ),

  getAnswers: (sessionId: string, deviceId: string) =>
    api.get<ApiEnvelope<SavedAnswer[]>>(
      `/student-exams/${seg(sessionId)}/answers`,
      { headers: deviceHeaders(deviceId) },
    ),

  saveAnswersBatch: (
    sessionId: string,
    deviceId: string,
    payload: SaveAnswersBatchRequest,
  ) =>
    api.post<ApiEnvelope<SaveAnswersBatchResult>>(
      `/student-exams/${seg(sessionId)}/answers/batch`,
      payload,
      { headers: deviceHeaders(deviceId) },
    ),

  submit: (sessionId: string, deviceId: string, payload: SubmitRequest = {}) =>
    api.post<ApiEnvelope<SubmittedSession>>(
      `/student-exams/${seg(sessionId)}/submit`,
      payload,
      { headers: deviceHeaders(deviceId) },
    ),
}
