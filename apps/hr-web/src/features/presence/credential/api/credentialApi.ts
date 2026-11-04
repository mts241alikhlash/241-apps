import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  Credential,
  CredentialQuery,
  CredentialWithCode,
  IssueCredentialPayload,
  RevokeCredentialPayload,
} from '../types'

export const credentialApi = {
  getCredentials: (params?: CredentialQuery) =>
    api.get<ApiPaginatedResponse<Credential>>('/presence/credentials', {
      params,
    }),

  getCredential: (id: string) =>
    api.get<ApiSingleResponse<Credential>>(`/presence/credentials/${id}`),

  getForPrint: (userIds: string[]) =>
    api.get<ApiSingleResponse<CredentialWithCode[]>>(
      '/presence/credentials/print',
      { params: { userIds: userIds.join(',') } },
    ),

  issue: (payload: IssueCredentialPayload) =>
    api.post<ApiSingleResponse<CredentialWithCode>>(
      '/presence/credentials',
      payload,
    ),

  revoke: (id: string, payload: RevokeCredentialPayload) =>
    api.post<ApiSingleResponse<Credential>>(
      `/presence/credentials/${id}/revoke`,
      payload,
    ),

  replace: (id: string, payload: RevokeCredentialPayload) =>
    api.post<ApiSingleResponse<CredentialWithCode>>(
      `/presence/credentials/${id}/replace`,
      payload,
    ),
}
