import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type { ActivityCreatePayload, ExamActivityRecord } from '../types'

export const examActivityApi = {
  create: (payload: ActivityCreatePayload) =>
    api.post<ApiSingleResponse<ExamActivityRecord>>(
      '/exam-activities',
      payload,
    ),

  updatePolicy: (id: string, policy: Record<string, number>) =>
    api.patch<ApiSingleResponse<ExamActivityRecord>>(
      `/exam-activities/${id}/policy`,
      policy,
    ),

  rotateToken: (id: string) =>
    api.post<ApiSingleResponse<ExamActivityRecord>>(
      `/exam-activities/${id}/token/rotate`,
      {},
    ),
}
