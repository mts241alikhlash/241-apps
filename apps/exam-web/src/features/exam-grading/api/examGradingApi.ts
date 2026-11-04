import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  GradePayload,
  GradingDetail,
  GradingItem,
  GradingSchedule,
  GradingScheduleQuery,
  GradingSessionQuery,
  GradingSessionRow,
} from '../types'

const seg = encodeURIComponent

export const examGradingApi = {
  getSchedules: (params?: GradingScheduleQuery) =>
    api.get<ApiPaginatedResponse<GradingSchedule>>('/exam-grading/schedules', {
      params,
    }),

  getSessions: (scheduleId: string, params?: GradingSessionQuery) =>
    api.get<ApiPaginatedResponse<GradingSessionRow>>(
      `/exam-grading/schedules/${seg(scheduleId)}/sessions`,
      { params },
    ),

  getSession: (sessionId: string) =>
    api.get<ApiSingleResponse<GradingDetail>>(
      `/exam-grading/sessions/${seg(sessionId)}`,
    ),

  grade: (sessionId: string, questionId: string, payload: GradePayload) =>
    api.patch<ApiSingleResponse<GradingItem>>(
      `/exam-grading/sessions/${seg(sessionId)}/answers/${seg(questionId)}`,
      payload,
    ),
}
