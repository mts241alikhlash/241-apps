import type { AuthUser } from '../types'
import { AUTH_USER_STORAGE_KEY as USER_KEY } from '@mts241alikhlash/web-shared/constants/storage'

interface StoredAuthUser extends Partial<AuthUser> {
  role?: string
  username?: string
}

function isStoredAuthUser(value: unknown): value is StoredAuthUser {
  return typeof value === 'object' && value !== null
}

export const authSessionService = {
  persistUser: (user: AuthUser) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user))
    }
  },

  hydrateUser: (): AuthUser | null => {
    if (typeof window === 'undefined') return null

    const storedUser = window.localStorage.getItem(USER_KEY)
    if (storedUser) {
      try {
        const parsed: unknown = JSON.parse(storedUser)
        if (!isStoredAuthUser(parsed)) return null

        const roles = parsed.roles ?? (parsed.role ? [parsed.role] : [])
        const identifier = parsed.identifier ?? parsed.username

        if (!parsed.id || !identifier) return null

        return {
          ...parsed,
          id: parsed.id,
          identifier,
          isActive: parsed.isActive ?? true,
          roles,
          permissions: parsed.permissions ?? [],
        }
      } catch {
        return null
      }
    }
    return null
  },

  clearPersistedSession: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(USER_KEY)
    }
  },
}
