import axios from 'axios'
import type {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios'
import { toast } from 'vue-sonner'
import { AUTH_USER_STORAGE_KEY } from '../constants/storage'
import {
  isServiceUnavailable,
  serviceUnavailableMessage,
} from './service-error'

export interface RefreshedUser {
  id: string
  identifier: string
  isActive: boolean
}

interface RefreshTokenResponse {
  data?: { accessToken?: string; user?: RefreshedUser }
  accessToken?: string
  user?: RefreshedUser
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
  /\/+$/,
  '',
)

let accessToken: string | null = null

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

function getAccessToken(): string | null {
  return accessToken?.trim() ? accessToken : null
}

function setAccessToken(token: string) {
  accessToken = token
}

function clearSession() {
  accessToken = null
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
  }
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

let isRefreshing = false
let pendingRequests: {
  resolve: (token: string) => void
  reject: (err: unknown) => void
}[] = []

function subscribeTokenRefresh(
  resolve: (token: string) => void,
  reject: (err: unknown) => void,
) {
  pendingRequests.push({ resolve, reject })
}

function notifySubscribers(newToken: string) {
  pendingRequests.forEach(({ resolve }) => resolve(newToken))
  pendingRequests = []
}

function rejectSubscribers(err: unknown) {
  pendingRequests.forEach(({ reject }) => reject(err))
  pendingRequests = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/')
    const isRetry = originalRequest?._retry === true

    if (error.response?.status === 401 && !isAuthEndpoint && !isRetry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken: string) => {
            if (originalRequest) {
              originalRequest._retry = true
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              resolve(api(originalRequest as AxiosRequestConfig))
            }
          }, reject)
        })
      }

      if (originalRequest) {
        originalRequest._retry = true
      }
      isRefreshing = true

      try {
        const refreshResponse = await axios.post<RefreshTokenResponse>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        )

        const envelope = refreshResponse.data
        const newToken: string | undefined =
          envelope?.data?.accessToken ?? envelope?.accessToken

        if (!newToken) throw new Error('No access token in refresh response')

        setAccessToken(newToken)
        notifySubscribers(newToken)
        if (originalRequest) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest as AxiosRequestConfig)
        }
      } catch (refreshError) {
        rejectSubscribers(new Error('Token refresh failed'))

        if (isServiceUnavailable(refreshError)) {
          toast.error('Layanan sedang tidak tersedia', {
            description: serviceUnavailableMessage(refreshError),
            duration: 6000,
          })
        } else {
          clearSession()
          toast.error('Sesi telah berakhir', {
            description: 'Kamu akan diarahkan ke halaman login.',
            duration: 4000,
          })
          setTimeout(() => {
            if (window.location.pathname !== '/login') {
              window.location.href = '/login'
            }
          }, 1500)
        }
      } finally {
        isRefreshing = false
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
