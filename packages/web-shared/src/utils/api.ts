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
  refreshSession,
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

async function restoreSession(): Promise<RefreshedUser | null> {
  try {
    return (await refreshSession()).user
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

let refreshing = false

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
      const leader = !refreshing
      refreshing = true

      let newToken: string
      try {
        newToken = await refreshAccessToken()
      } catch (refreshError) {
        if (!leader) return Promise.reject(new Error('Token refresh failed'))
        refreshing = false
        handleRefreshFailure(refreshError)
        return Promise.reject(error)
      }

      originalRequest.headers.Authorization = `Bearer ${newToken}`
      if (!leader) return api(originalRequest as AxiosRequestConfig)

      try {
        return await api(originalRequest as AxiosRequestConfig)
      } finally {
        refreshing = false
      }
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
