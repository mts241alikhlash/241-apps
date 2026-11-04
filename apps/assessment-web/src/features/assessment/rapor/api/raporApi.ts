import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import type {
  BulkGeneratePayload,
  BulkGenerateResult,
  GenerateRaporPayload,
  RaporData,
  RaporDetailData,
  RaporListMeta,
  RaporQueryParams,
  UpdateRaporPayload,
} from '../types'

export const raporApi = {
  getRapors: (params?: RaporQueryParams) => {
    return api.get<ApiPaginatedResponse<RaporData, RaporListMeta>>('/rapors', {
      params,
    })
  },
  getMine: (params?: RaporQueryParams) => {
    return api.get<ApiPaginatedResponse<RaporData, RaporListMeta>>(
      '/rapors/me',
      { params },
    )
  },

  getRaporById: (id: string) => {
    return api.get<ApiSingleResponse<RaporData>>(`/rapors/${id}`)
  },
  getRaporDetail: (id: string) => {
    return api.get<ApiSingleResponse<RaporDetailData>>(`/rapors/${id}/detail`)
  },
  getMyRaporDetail: (id: string) => {
    return api.get<ApiSingleResponse<RaporDetailData>>(
      `/rapors/me/${id}/detail`,
    )
  },
  generateRapor: (payload: GenerateRaporPayload) => {
    return api.post<ApiSingleResponse<RaporData>>('/rapors/generate', payload)
  },
  bulkGenerateRapor: (payload: BulkGeneratePayload) => {
    return api.post<ApiSingleResponse<BulkGenerateResult>>(
      '/rapors/generate/bulk',
      payload,
    )
  },
  updateRapor: (id: string, payload: UpdateRaporPayload) => {
    return api.patch<ApiSingleResponse<RaporData>>(`/rapors/${id}`, payload)
  },
  publishRapor: (id: string) => {
    return api.patch<ApiSingleResponse<RaporData>>(`/rapors/${id}/publish`)
  },
  deleteRapor: (id: string) => {
    return api.delete(`/rapors/${id}`)
  },
  exportReportCard: (id: string) => {
    return api.get(`/rapors/${id}/export`, { responseType: 'blob' })
  },
}
