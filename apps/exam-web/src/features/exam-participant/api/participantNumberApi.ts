import type { components } from '@mts241alikhlash/exam-api'
import { unwrap } from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'

type Schemas = components['schemas']

export type IssueParticipantNumbersResult =
  Schemas['IssueSemesterNumbersResponseDto']
export type ParticipantNumberItem = Schemas['ParticipantNumberItemDto']

export const participantNumberApi = {
  issue: (semesterId: string) =>
    unwrap(
      examClient.POST('/exam-participant-numbers/issue', {
        body: { semesterId },
      }),
    ),

  lookup: async (
    semesterId: string,
    studentIds: string[],
  ): Promise<ParticipantNumberItem[]> => {
    const body = await unwrap(
      examClient.POST('/exam-participant-numbers/lookup', {
        body: { semesterId, studentIds },
      }),
    )
    return body.items
  },
}
