import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { useAuthSession, useAuthStore } from './features/auth'

describe('one pinia instance', () => {
  it('reads state written through the host pinia inside the package', () => {
    setActivePinia(createPinia())
    useAuthStore().setUser({
      id: 'u1',
      identifier: 'admin',
      isActive: true,
      roles: ['ADMIN'],
      permissions: ['a.read'],
    })
    const session = useAuthSession()
    expect(session.hasPermission('a.read')).toBe(true)
    expect(session.isAuthenticated.value).toBe(true)
  })
})
