import type { components } from '@mts241alikhlash/exam-api'
import { unwrap } from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'
import type { ExamType } from '@/features/exam-shared/examType'

type Schemas = components['schemas']

export type ExamPolicyPreset = Schemas['ExamPolicyPresetDto']
export type UpdatePresetPayload = Schemas['UpdateActivityPolicyRequestDto']

export const examPresetApi = {
  list: () => unwrap(examClient.GET('/exam-policy-presets')),

  update: (type: ExamType, body: UpdatePresetPayload) =>
    unwrap(
      examClient.PATCH('/exam-policy-presets/{type}', {
        params: { path: { type } },
        body,
      }),
    ),
}
