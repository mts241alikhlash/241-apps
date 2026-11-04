import api from '@mts241alikhlash/web-shared/utils/api'
import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import type {
  HomepageResponse,
  HomepageSectionSetting,
  UpdateHomepageSectionPayload,
} from '../types'

export const homepageApi = {
  getPublic: () =>
    api.get<ApiSingleResponse<HomepageResponse>>('/portal/public/homepage'),

  getSections: () =>
    api.get<ApiSingleResponse<HomepageSectionSetting[]>>(
      '/portal/homepage/sections',
    ),

  updateSection: (key: string, payload: UpdateHomepageSectionPayload) =>
    api.patch<ApiSingleResponse<HomepageSectionSetting>>(
      `/portal/homepage/sections/${key}`,
      payload,
    ),
}
