import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import type {
  CreatePostPayload,
  PinPostPayload,
  PostAdminDetail,
  PostAdminSummary,
  PostQuery,
  PublishPostPayload,
  UpdatePostPayload,
  VersionPayload,
} from '../types'

export const postApi = {
  list: (params: PostQuery) =>
    api.get<ApiPaginatedResponse<PostAdminSummary>>('/portal/posts', {
      params,
    }),

  getById: (id: string) =>
    api.get<ApiSingleResponse<PostAdminDetail>>(`/portal/posts/${id}`),

  create: (payload: CreatePostPayload) =>
    api.post<ApiSingleResponse<PostAdminDetail>>('/portal/posts', payload),

  update: (id: string, payload: UpdatePostPayload) =>
    api.patch<ApiSingleResponse<PostAdminDetail>>(
      `/portal/posts/${id}`,
      payload,
    ),

  publish: (id: string, payload: PublishPostPayload) =>
    api.post<ApiSingleResponse<PostAdminDetail>>(
      `/portal/posts/${id}/publish`,
      payload,
    ),

  unpublish: (id: string, payload: VersionPayload) =>
    api.post<ApiSingleResponse<PostAdminDetail>>(
      `/portal/posts/${id}/unpublish`,
      payload,
    ),

  archive: (id: string, payload: VersionPayload) =>
    api.post<ApiSingleResponse<PostAdminDetail>>(
      `/portal/posts/${id}/archive`,
      payload,
    ),

  pin: (id: string, payload: PinPostPayload) =>
    api.post<ApiSingleResponse<PostAdminDetail>>(
      `/portal/posts/${id}/pin`,
      payload,
    ),

  remove: (id: string) => api.delete<void>(`/portal/posts/${id}`),

  restore: (id: string) =>
    api.post<ApiSingleResponse<PostAdminDetail>>(`/portal/posts/${id}/restore`),
}
