import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  ActivityCreatePayload,
  ActivityStatus,
  ExamActivityRecord,
} from '../types'

const seg = encodeURIComponent

export const examActivityApi = {
  list: () =>
    api.get<ApiSingleResponse<ExamActivityRecord[]>>('/exam-activities'),

  create: (payload: ActivityCreatePayload) =>
    api.post<ApiSingleResponse<ExamActivityRecord>>(
      '/exam-activities',
      payload,
    ),

  updateStatus: (id: string, status: ActivityStatus) =>
    api.patch<ApiSingleResponse<ExamActivityRecord>>(
      `/exam-activities/${seg(id)}`,
      { status },
    ),

  updatePolicy: (id: string, policy: Record<string, number>) =>
    api.patch<ApiSingleResponse<ExamActivityRecord>>(
      `/exam-activities/${id}/policy`,
      policy,
    ),

  issueParticipantNumbers: (id: string) =>
    api.post<ApiSingleResponse<{ issued: boolean }>>(
      `/exam-activities/${seg(id)}/participant-numbers/issue`,
      {},
    ),

  rotateToken: (id: string) =>
    api.post<ApiSingleResponse<ExamActivityRecord>>(
      `/exam-activities/${id}/token/rotate`,
      {},
    ),
}
