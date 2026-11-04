import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type { AcademicSetting, AcademicSettingSavePayload } from '../types'

export const academicSettingApi = {
  getAcademicSetting: () => {
    return api.get<ApiSingleResponse<AcademicSetting>>('/academic-settings')
  },

  updateAcademicSetting: (payload: AcademicSettingSavePayload) => {
    return api.patch<ApiSingleResponse<AcademicSetting>>(
      '/academic-settings',
      payload,
    )
  },
}
