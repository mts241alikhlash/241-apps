export interface IssuedCredential {
  userId: string
  identifier: string
  password: string
}

export abstract class IIdentityCredentialsPort {
  abstract resetPasswords(userIds: string[]): Promise<IssuedCredential[]>
}
