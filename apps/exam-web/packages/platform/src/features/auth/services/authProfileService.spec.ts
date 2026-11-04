import { describe, it, expect, vi } from 'vitest'
import { authProfileService } from './authProfileService'
import { profileApi } from '@/features/platform/profile'

vi.mock('@/features/platform/profile', () => ({
  profileApi: { getMyProfile: vi.fn() },
}))

describe('authProfileService.enrichUserWithProfile', () => {
  it('takes the avatar from the avatarUrl identity-service sends', async () => {
    vi.mocked(profileApi.getMyProfile).mockResolvedValue({
      data: {
        data: {
          id: 'p-1',
          name: 'Budi',
          email: null,
          avatarUrl: 'https://files.example/avatar.jpg',
        },
      },
    } as never)

    const user = await authProfileService.enrichUserWithProfile({
      id: 'u-1',
    } as never)

    expect(user.profile?.avatar).toBe('https://files.example/avatar.jpg')
  })
})
