import axios from 'axios'
import {
  API_BASE_URL,
  setAccessToken,
} from '@mts241alikhlash/web-shared/utils/api'
import { authConfig } from '../config'
import { useAuthStore } from '../stores/authStore'
import { authIdentityService } from './authIdentityService'
import { authSessionService } from './authSessionService'
import { challengeFor, randomToken } from './pkce'

const PENDING_KEY = 'sso_pending'

interface PendingSignIn {
  state: string
  verifier: string
  target: string
}

export function safeTarget(value: unknown, fallback: string): string {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
    ? value
    : fallback
}

function callbackUrl(): string {
  return `${window.location.origin}/oauth/callback`
}

function takePending(): PendingSignIn | null {
  const raw = window.sessionStorage.getItem(PENDING_KEY)
  window.sessionStorage.removeItem(PENDING_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PendingSignIn
  } catch {
    return null
  }
}

export const ssoService = {
  startSignIn: async (target: string): Promise<void> => {
    const verifier = randomToken(64)
    const state = randomToken(32)
    const pending: PendingSignIn = {
      state,
      verifier,
      target: safeTarget(target, authConfig.value.homeRoute),
    }
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
    const params = new URLSearchParams({
      app: authConfig.value.ssoApp,
      redirect_uri: callbackUrl(),
      code_challenge: await challengeFor(verifier),
      code_challenge_method: 'S256',
      state,
    })
    window.location.assign(`${API_BASE_URL}/sso/start?${params.toString()}`)
  },

  completeSignIn: async (
    code: unknown,
    state: unknown,
  ): Promise<string | null> => {
    const pending = takePending()
    if (!pending || typeof code !== 'string' || state !== pending.state) {
      return null
    }
    try {
      const res = await axios.post<{ data?: { accessToken?: string } }>(
        `${API_BASE_URL}/sso/exchange`,
        {
          code,
          code_verifier: pending.verifier,
          redirect_uri: callbackUrl(),
        },
        { withCredentials: true },
      )
      const token = res.data?.data?.accessToken
      if (!token) return null
      setAccessToken(token)
      const user = await authIdentityService.fetchIdentity()
      authSessionService.persistUser(user)
      useAuthStore().setUser(user)
      return pending.target
    } catch {
      return null
    }
  },

  accountsUrl: (path: string): string =>
    `${API_BASE_URL}/sso/accounts?${new URLSearchParams({ path }).toString()}`,
}
