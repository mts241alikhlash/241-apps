export interface AuthProfile {
  id?: string
  name?: string | null
  email?: string | null
  avatar?: string | null
}

export interface AuthUser {
  id: string
  identifier: string
  isActive: boolean
  roles: string[]
  permissions: string[]
  name?: string | null
  profile?: AuthProfile | null
}
