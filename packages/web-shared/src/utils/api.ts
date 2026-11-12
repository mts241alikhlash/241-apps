import axios from 'axios'
import type {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios'
import { toast } from 'vue-sonner'
import {
  API_BASE_URL,
  clearSession,
  getAccessToken,
  handleRefreshFailure,
  refreshAccessToken,
  setAccessToken,
} from './auth-session'
import type { RefreshedUser } from './auth-session'
import {
  isServiceUnavailable,
  serviceUnavailableMessage,
} from './service-error'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

interface RefreshTokenResponse {
  data?: { accessToken?: string; user?: RefreshedUser }
  accessToken?: string
  user?: RefreshedUser
}

async function restoreSession(): Promise<RefreshedUser | null> {
  try {
    const res = await axios.post<RefreshTokenResponse>(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    const token: string | undefined =
      res.data?.data?.accessToken ?? res.data?.accessToken
    if (!token) throw new Error('No access token in refresh response')
    setAccessToken(token)
    return res.data?.data?.user ?? res.data?.user ?? null
  } catch (error) {
    if (isServiceUnavailable(error)) {
      toast.error('Layanan sedang tidak tersedia', {
        description: serviceUnavailableMessage(error),
        duration: 6000,
      })
      return null
    }

    clearSession()
    return null
  }
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/')
    const isRetry = originalRequest?._retry === true

    if (
      error.response?.status === 401 &&
      !isAuthEndpoint &&
      !isRetry &&
      originalRequest
    ) {
      originalRequest._retry = true

      let newToken: string
      try {
        newToken = await refreshAccessToken()
      } catch (refreshError) {
        handleRefreshFailure(refreshError)
        return Promise.reject(error)
      }

      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest as AxiosRequestConfig)
    }

    return Promise.reject(error)
  },
)

export default api
export {
  API_BASE_URL,
  clearSession,
  getAccessToken,
  restoreSession,
  setAccessToken,
}
