import { Injectable } from '@nestjs/common'
import { ServiceClient } from '@mts241alikhlash/nest-core/service-client'
import {
  IIdentityCredentialsPort,
  type IssuedCredential,
} from './identity-credentials.port.js'

const URL_KEY = 'IDENTITY_SERVICE_URL'
const RESET_CHUNK = 25

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function isCredential(row: unknown): row is IssuedCredential {
  return (
    isRecord(row) &&
    typeof row.userId === 'string' &&
    typeof row.identifier === 'string' &&
    typeof row.password === 'string'
  )
}

@Injectable()
export class HttpIdentityCredentialsAdapter extends IIdentityCredentialsPort {
  constructor(private readonly client: ServiceClient) {
    super()
  }

  async resetPasswords(userIds: string[]): Promise<IssuedCredential[]> {
    const issued: IssuedCredential[] = []
    for (let i = 0; i < userIds.length; i += RESET_CHUNK) {
      const chunk = userIds.slice(i, i + RESET_CHUNK)
      const data = await this.client.postData(
        URL_KEY,
        '/accounts/passwords/reset',
        { userIds: chunk },
      )
      const rows = isRecord(data) && Array.isArray(data.data) ? data.data : null
      if (rows === null) return this.client.malformed(URL_KEY)
      for (const row of rows as unknown[]) {
        if (!isCredential(row)) return this.client.malformed(URL_KEY)
        issued.push({
          userId: row.userId,
          identifier: row.identifier,
          password: row.password,
        })
      }
    }
    return issued
  }
}
