import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import type { FileItem } from '../types/file.types'
import api from '@mts241alikhlash/web-shared/utils/api'
import { authConfig } from '../../auth/config'

export const fileApi = {
  getFiles: (schoolUnitId?: string) => {
    const params = schoolUnitId ? { schoolUnitId } : {}
    return api.get<ApiSingleResponse<FileItem[]>>('/files', { params })
  },

  uploadFile: (file: File, schoolUnitId?: string, categoryId?: string) => {
    const formData = new FormData()
    formData.append('file', file)

    const params: {
      appKey: string
      schoolUnitId?: string
      categoryId?: string
    } = { appKey: authConfig.value.appKey }
    if (schoolUnitId) params.schoolUnitId = schoolUnitId
    if (categoryId) params.categoryId = categoryId

    return api.post<ApiSingleResponse<FileItem>>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params,
    })
  },

  deleteFile: (id: string) => {
    return api.delete<void>(`/files/${id}`)
  },
}
