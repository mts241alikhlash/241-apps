import { authApi } from '../api/authApi'
import type { AuthUser, SessionIdentity } from '../types'

function toAuthUser(identity: SessionIdentity): AuthUser {
  return {
    id: identity.id,
    identifier: identity.identifier,
    isActive: identity.isActive,
    roles: identity.roles ?? [],
    permissions: identity.permissions ?? [],
    name: identity.name,
  }
}

export const authIdentityService = {
  fetchIdentity: async (): Promise<AuthUser> => {
    const res = await authApi.me()
    const identity = res.data?.data
    if (!identity?.id) {
      throw new Error('No identity in /auth/me response')
    }
    return toAuthUser(identity)
  },
}
