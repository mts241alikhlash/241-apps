export type PresenceSubjectType = 'STUDENT' | 'EMPLOYEE'
export type CredentialStatus = 'ACTIVE' | 'REVOKED' | 'REPLACED'

export interface CredentialHolder {
  id: string
  identifier: string
  displayName: string | null
  photoUrl: string | null
}

export interface Credential {
  id: string
  userId: string
  subjectType: PresenceSubjectType
  status: CredentialStatus
  issuedAt: string
  revokedAt?: string | null
  revokedReason?: string | null
  replacedById?: string | null
  holder: CredentialHolder
}

export interface CredentialWithCode extends Credential {
  code: string
}

export interface CredentialQuery {
  page?: number
  limit?: number
  subjectType?: PresenceSubjectType
  status?: CredentialStatus
  userId?: string
  search?: string
}

export interface IssueCredentialPayload {
  userId: string
  subjectType: PresenceSubjectType
}

export interface RevokeCredentialPayload {
  reason: string
}

export interface PersonOption {
  userId: string
  name: string
}
