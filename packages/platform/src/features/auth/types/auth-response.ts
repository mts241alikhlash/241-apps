import type { AuthUser } from './session'

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export interface SessionIdentity {
  id: string
  identifier: string
  isActive: boolean
  name: string | null
  roles: string[]
  permissions: string[]
}

export interface LogoutResponse {
  message: string
}

export interface RefreshTokenResponse {
  data?: { accessToken?: string }
  accessToken?: string
}
