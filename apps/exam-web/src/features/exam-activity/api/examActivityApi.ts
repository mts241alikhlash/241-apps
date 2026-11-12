import { unwrap } from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'
import type {
  ActivityCreatePayload,
  ActivityPolicyPayload,
  ActivityStatus,
  ExamActivityQuery,
} from '../types'

export const examActivityApi = {
  list: (query?: ExamActivityQuery) =>
    unwrap(examClient.GET('/exam-activities', { params: { query } })),

  get: (id: string) =>
    unwrap(
      examClient.GET('/exam-activities/{id}', { params: { path: { id } } }),
    ),

  create: (body: ActivityCreatePayload) =>
    unwrap(examClient.POST('/exam-activities', { body })),

  updateStatus: (id: string, status: ActivityStatus) =>
    unwrap(
      examClient.PATCH('/exam-activities/{id}', {
        params: { path: { id } },
        body: { status },
      }),
    ),

  updatePolicy: (id: string, body: ActivityPolicyPayload) =>
    unwrap(
      examClient.PATCH('/exam-activities/{id}/policy', {
        params: { path: { id } },
        body,
      }),
    ),

  issueParticipantNumbers: (id: string) =>
    unwrap(
      examClient.POST('/exam-activities/{id}/participant-numbers/issue', {
        params: { path: { id } },
      }),
    ),

  rotateToken: (id: string) =>
    unwrap(
      examClient.POST('/exam-activities/{id}/token/rotate', {
        params: { path: { id } },
      }),
    ),
}
