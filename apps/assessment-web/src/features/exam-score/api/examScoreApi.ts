import type { ApiPaginatedResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type { ExamScore, ExamScoreQuery } from '../types'

export const examScoreApi = {
  getScores: (params?: ExamScoreQuery) =>
    api.get<ApiPaginatedResponse<ExamScore>>('/exam-scores', { params }),
}
