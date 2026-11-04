import { describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  user: null as null | { roles: string[]; permissions: string[] },
}))
vi.mock('../stores/authStore', () => ({ useAuthStore: () => state }))

import { useRoleGuard } from './useRoleGuard'

describe('useRoleGuard', () => {
  it('answers from permissions only, whatever the role is called', () => {
    state.user = { roles: ['SUPER_ADMIN'], permissions: [] }
    expect(useRoleGuard().can('students.read')).toBe(false)

    state.user = { roles: ['ANY'], permissions: ['students.read'] }
    expect(useRoleGuard().can('students.read', 'x.y')).toBe(true)
  })

  it('exposes no role-name helper', () => {
    expect('isSuperAdmin' in useRoleGuard()).toBe(false)
  })
})
