import type { ApiPaginatedResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'

export interface ReligionRef {
  id: string
  name: string
  isActive: boolean
}

export interface BloodTypeRef {
  id: string
  name: string
  isActive: boolean
}

export const religionRefApi = {
  getReligions: (params?: { limit?: number; isActive?: boolean }) => {
    return api.get<ApiPaginatedResponse<ReligionRef>>('/religions', {
      params,
    })
  },
}

export const bloodTypeRefApi = {
  getBloodTypes: (params?: { limit?: number; isActive?: boolean }) => {
    return api.get<ApiPaginatedResponse<BloodTypeRef>>('/blood-types', {
      params,
    })
  },
}
