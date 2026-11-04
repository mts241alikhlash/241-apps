import type { SchoolIdentity } from './profile-display'

export type SchoolIdentityProvider = (context: {
  userId: string
  isOwnProfile: boolean
  roles: string[]
}) => Promise<SchoolIdentity | null>
