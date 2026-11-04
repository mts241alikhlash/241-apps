import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  AssessmentWeight,
  ReplaceAssessmentWeightsPayload,
} from '../types'

export const assessmentWeightApi = {
  getWeights: (teachingAssignmentId: string) => {
    return api.get<ApiSingleResponse<AssessmentWeight[]>>(
      '/assessment-weights',
      { params: { teachingAssignmentId } },
    )
  },

  replaceWeights: (payload: ReplaceAssessmentWeightsPayload) => {
    return api.put<ApiSingleResponse<AssessmentWeight[]>>(
      '/assessment-weights',
      payload,
    )
  },
}
