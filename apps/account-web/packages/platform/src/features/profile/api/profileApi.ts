import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import type { ProfileRecord, ProfileUpdatePayload } from '../types'
import api from '@mts241alikhlash/web-shared/utils/api'

export const profileApi = {
  getProfileByUserId: (userId: string) => {
    return api.get<ApiSingleResponse<ProfileRecord>>(`/profiles/${userId}`)
  },

  getMyProfile: () => {
    return api.get<ApiSingleResponse<ProfileRecord>>('/profiles/me')
  },

  updateMyProfile: (payload: ProfileUpdatePayload) => {
    return api.patch<ApiSingleResponse<ProfileRecord>>('/profiles/me', payload)
  },

  updateProfileByUserId: (userId: string, payload: ProfileUpdatePayload) => {
    return api.patch<ApiSingleResponse<ProfileRecord>>(
      `/profiles/${userId}`,
      payload,
    )
  },

  setMyPhoto: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ApiSingleResponse<ProfileRecord>>(
      '/profiles/me/photo',
      formData,
    )
  },

  clearMyPhoto: () => {
    return api.delete<ApiSingleResponse<ProfileRecord>>('/profiles/me/photo')
  },
}
