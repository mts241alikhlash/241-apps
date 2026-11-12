import type { components } from '@mts241alikhlash/exam-api'
import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type { ExamType } from '@/features/exam-shared/examType'

type Schemas = components['schemas']

export type ExamPolicyPreset = Schemas['ExamPolicyPresetDto']
export type UpdatePresetPayload = Schemas['UpdateActivityPolicyRequestDto']

const seg = encodeURIComponent

export const examPresetApi = {
  list: () =>
    api.get<ApiSingleResponse<ExamPolicyPreset[]>>('/exam-policy-presets'),

  update: (type: ExamType, payload: UpdatePresetPayload) =>
    api.patch<ApiSingleResponse<ExamPolicyPreset>>(
      `/exam-policy-presets/${seg(type)}`,
      payload,
    ),
}
