import {
  unwrap,
  unwrapPage,
} from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'
import type {
  GradePayload,
  GradingScheduleQuery,
  GradingSessionQuery,
} from '../types'

export const examGradingApi = {
  getSchedules: (query?: GradingScheduleQuery) =>
    unwrapPage(
      examClient.GET('/exam-grading/schedules', { params: { query } }),
    ),

  getSessions: (scheduleId: string, query?: GradingSessionQuery) =>
    unwrapPage(
      examClient.GET('/exam-grading/schedules/{scheduleId}/sessions', {
        params: { path: { scheduleId }, query },
      }),
    ),

  getSession: (sessionId: string) =>
    unwrap(
      examClient.GET('/exam-grading/sessions/{sessionId}', {
        params: { path: { sessionId } },
      }),
    ),

  grade: (sessionId: string, questionId: string, body: GradePayload) =>
    unwrap(
      examClient.PATCH(
        '/exam-grading/sessions/{sessionId}/answers/{questionId}',
        { params: { path: { sessionId, questionId } }, body },
      ),
    ),
}
