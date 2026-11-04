import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  permissions: [] as string[],
  get: vi.fn(),
}))
vi.mock('@/features/platform/auth', () => ({
  useAuthStore: () => ({ user: { permissions: state.permissions } }),
}))
vi.mock('@mts241alikhlash/web-shared/utils/api', () => ({
  default: { get: state.get },
}))

import { schoolIdentityProvider } from './school-identity'

describe('schoolIdentityProvider', () => {
  beforeEach(() => state.get.mockReset())

  it('reads the classroom for a student', async () => {
    state.permissions = ['students.read-own']
    state.get.mockResolvedValue({
      data: { data: { classroom: { displayName: '7A' } } },
    })
    const identity = await schoolIdentityProvider({ isOwnProfile: true })
    expect(identity?.className).toBe('7A')
    expect(state.get).toHaveBeenCalledWith('/students/me/classroom')
  })

  it('reads the employee for a holder of every permission', async () => {
    state.permissions = ['students.read-own', 'students.read']
    state.get.mockResolvedValue({ data: { data: null } })
    await schoolIdentityProvider({ isOwnProfile: true })
    expect(state.get).toHaveBeenCalledWith('/employees/me')
    expect(state.get).not.toHaveBeenCalledWith('/students/me/classroom')
  })
})
