export interface ProfileEnvelope {
  id?: string
  userId?: string
  name?: string | null
  email?: string | null
  avatarUrl?: string | null
}

export interface ExtractEnvelope {
  data?: ProfileEnvelope | null
}
