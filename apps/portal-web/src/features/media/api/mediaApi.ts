import api from '@mts241alikhlash/web-shared/utils/api'
import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import type { MediaLibraryItem, MediaUsage } from '../types'

export const mediaApi = {
  library: () =>
    api.get<ApiSingleResponse<MediaLibraryItem[]>>('/portal/media'),

  usage: (fileId: string) =>
    api.get<ApiSingleResponse<MediaUsage>>(`/portal/media/${fileId}/usage`),

  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<ApiSingleResponse<{ id: string; url: string }>>(
      '/files/upload?appKey=PORTAL',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },
}
