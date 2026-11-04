import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import type {
  ReferenceList,
  ReferenceListItem,
  ReferenceListPayload,
} from './lists'

export const referenceListApi = {
  list: (list: ReferenceList, params?: { limit?: number; search?: string }) =>
    api.get<ApiPaginatedResponse<ReferenceListItem>>(`/${list.path}`, {
      params,
    }),
  create: (list: ReferenceList, payload: ReferenceListPayload) =>
    api.post<ApiSingleResponse<ReferenceListItem>>(`/${list.path}`, payload),
  update: (list: ReferenceList, id: string, payload: ReferenceListPayload) =>
    api.patch<ApiSingleResponse<ReferenceListItem>>(
      `/${list.path}/${id}`,
      payload,
    ),
  remove: (list: ReferenceList, id: string) =>
    api.delete(`/${list.path}/${id}`),
}
