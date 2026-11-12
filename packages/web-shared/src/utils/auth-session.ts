import axios from 'axios'
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

export interface RefreshTokenResponse {
  data?: { accessToken?: string; user?: RefreshedUser }
  accessToken?: string
  user?: RefreshedUser
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
  /\/+$/,
  '',
)

interface RefreshedSession {
  token: string
  user: RefreshedUser | null
}

let accessToken: string | null = null
let inflight: Promise<RefreshedSession> | null = null
const handled = new WeakSet<object>()

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

function refreshSession(): Promise<RefreshedSession> {
  inflight ??= axios
    .post<RefreshTokenResponse>(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    .then((res) => {
      const token: string | undefined =
        res.data?.data?.accessToken ?? res.data?.accessToken
      if (!token) throw new Error('No access token in refresh response')
      setAccessToken(token)
      return { token, user: res.data?.data?.user ?? res.data?.user ?? null }
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

async function refreshAccessToken(): Promise<string> {
  return (await refreshSession()).token
}

function handleRefreshFailure(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    if (handled.has(error)) return
    handled.add(error)
  }

  if (isServiceUnavailable(error)) {
    toast.error('Layanan sedang tidak tersedia', {
      description: serviceUnavailableMessage(error),
      duration: 6000,
    })
    return
  }

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

export {
  API_BASE_URL,
  clearSession,
  getAccessToken,
  handleRefreshFailure,
  refreshAccessToken,
  refreshSession,
  setAccessToken,
}
