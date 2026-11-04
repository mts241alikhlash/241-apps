import api, { API_BASE_URL } from '@mts241alikhlash/web-shared/utils/api'
import type { ApiEnvelope } from '@mts241alikhlash/web-shared/types/api'
import type {
  LoginPayload,
  LoginResponse,
  LogoutResponse,
  AuthChangePasswordPayload,
  ResetPasswordPayload,
  SessionIdentity,
} from '../types'

export const authApi = {
  login: (payload: LoginPayload) => {
    return api.post<ApiEnvelope<LoginResponse>>('/auth/login', payload)
  },

  googleStartUrl: (returnOrigin?: string) => {
    const base = `${API_BASE_URL}/auth/google`
    if (!returnOrigin) return base
    return `${base}?redirect=${encodeURIComponent(returnOrigin)}`
  },

  me: () => {
    return api.get<ApiEnvelope<SessionIdentity>>('/auth/me')
  },

  logout: () => {
    return api.post<ApiEnvelope<LogoutResponse>>('/auth/logout')
  },

  changePassword: (payload: AuthChangePasswordPayload) => {
    return api.post<ApiEnvelope<{ success: boolean; message: string }>>(
      '/auth/change-password',
      payload,
    )
  },

  forgotPassword: (payload: { identifier: string }) => {
    return api.post<ApiEnvelope<{ success: boolean; message: string }>>(
      '/auth/forgot-password',
      payload,
    )
  },

  resetPassword: (payload: ResetPasswordPayload) => {
    return api.post<ApiEnvelope<{ success: boolean; message: string }>>(
      '/auth/reset-password',
      payload,
    )
  },
}
