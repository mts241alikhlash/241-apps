import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import type { PostDetail, PostSummary, PublicPostQuery } from '../types'

export const publicPostApi = {
  list: (params: PublicPostQuery) =>
    api.get<ApiPaginatedResponse<PostSummary>>('/portal/public/posts', {
      params,
    }),

  getBySlug: (type: string, slug: string) =>
    api.get<ApiSingleResponse<PostDetail>>(
      `/portal/public/posts/${type}/${slug}`,
    ),

  getRelated: (type: string, slug: string) =>
    api.get<ApiSingleResponse<PostSummary[]>>(
      `/portal/public/posts/${type}/${slug}/related`,
    ),
}
