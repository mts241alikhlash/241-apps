import { isAxiosError } from 'axios'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../stores/authStore'
import type { LoginPayload } from '../types'
import {
  setAccessToken,
  clearSession,
  restoreSession as mintTokenFromCookie,
} from '@mts241alikhlash/web-shared/utils/api'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { authSessionService } from './authSessionService'
import { authIdentityService } from './authIdentityService'
import { authProfileService } from './authProfileService'
import { useReferenceList } from '../../reference-data'
import { notifyIfOutage } from '@mts241alikhlash/web-shared/utils/notify-outage'

export const authService = {
  loginUser: async (payload: LoginPayload) => {
    try {
      const response = await authApi.login(payload)
      const data = response.data?.data

      if (!data?.accessToken) {
        throw new Error('Login gagal. Silakan coba lagi.')
      }

      setAccessToken(data.accessToken)
      const user = await authIdentityService.fetchIdentity()
      authSessionService.persistUser(user)

      const store = useAuthStore()
      store.setUser(user)

      return { ...data, user }
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 403) {
        const message = (error.response.data as { message?: unknown } | null)
          ?.message
        if (typeof message === 'string')
          throw new Error(message, { cause: error })
      }
      throw new Error(
        getIndonesianErrorMessage(error, 'Login gagal. Silakan coba lagi.'),
        { cause: error },
      )
    }
  },

  restoreSession: async (): Promise<boolean> => {
    const refreshed = await mintTokenFromCookie()
    if (!refreshed) return false

    if (authSessionService.hydrateUser()) return true

    try {
      authSessionService.persistUser(await authIdentityService.fetchIdentity())
      return true
    } catch (err) {
      if (notifyIfOutage(err)) return false

      clearSession()
      return false
    }
  },

  logoutUser: async () => {
    try {
      await authApi.logout()
    } catch (error) {
      void error
    } finally {
      clearSession()
      authSessionService.clearPersistedSession()
      const store = useAuthStore()
      store.clearUser()
      useReferenceList().clear()
    }
  },

  syncAuthenticatedUserProfile: async () => {
    const store = useAuthStore()
    if (!store.user) return null

    const enrichedUser = await authProfileService.enrichUserWithProfile(
      store.user,
    )
    store.setUser(enrichedUser)
    authSessionService.persistUser(enrichedUser)

    return enrichedUser
  },
}
