import type {
  AuthUser,
  AuthProfile,
  ProfileEnvelope,
  ExtractEnvelope,
} from '../types'
import { profileApi } from '@/features/platform/profile'
import { notifyIfOutage } from '@mts241alikhlash/web-shared/utils/notify-outage'

function extractProfile(payload: unknown): AuthProfile | null {
  if (!payload || typeof payload !== 'object') return null

  const envelope = payload as ExtractEnvelope
  const raw = (envelope.data ?? payload) as ProfileEnvelope

  if (!raw || typeof raw !== 'object') return null

  return {
    id: raw.id,
    name: raw.name ?? null,
    email: raw.email ?? null,
    avatar: raw.avatarUrl ?? null,
  }
}

export const authProfileService = {
  enrichUserWithProfile: async (user: AuthUser): Promise<AuthUser> => {
    try {
      const profileRes = await profileApi.getMyProfile()
      const profile = extractProfile(profileRes.data)

      return {
        ...user,
        name: profile?.name ?? user.name ?? null,
        profile: {
          ...(user.profile ?? {}),
          ...(profile ?? {}),
        },
      }
    } catch (err) {
      notifyIfOutage(err)
      return user
    }
  },
}
