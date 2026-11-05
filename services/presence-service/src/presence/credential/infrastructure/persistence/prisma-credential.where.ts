import { Prisma } from '../../../../generated/prisma/client.js'
import { CredentialQueryInput } from '../../domain/interfaces/credential-repository.interface.js'

export const NOT_DELETED = { deletedAt: null } as const

export function credentialWhere(
  query: CredentialQueryInput,
): Prisma.PresenceCredentialWhereInput {
  return {
    ...NOT_DELETED,
    ...(query.userId && { userId: query.userId }),
    ...(query.status && { status: query.status }),
    ...(query.subjectType && { subjectType: query.subjectType }),
  }
}

export function validOnDateWhere(
  userId: string,
  day: { from: Date; to: Date },
): Prisma.PresenceCredentialWhereInput {
  return {
    ...NOT_DELETED,
    userId,
    issuedAt: { lte: day.to },
    OR: [{ revokedAt: null }, { revokedAt: { gte: day.from } }],
  }
}
