import { Injectable } from '@nestjs/common'
import { ServiceClient } from '@mts241alikhlash/nest-core/service-client'
import { IEmployeeIdentityReadPort } from './employee-identity.port.js'

const URL_KEY = 'HR_SERVICE_URL'
export const EMPLOYEE_CACHE_TTL_MS = 10 * 60_000
const EMPLOYEE_CACHE_MAX = 5000

@Injectable()
export class HttpEmployeeIdentityAdapter extends IEmployeeIdentityReadPort {
  private readonly employeeOf = new Map<
    string,
    { id: string | null; expiresAt: number }
  >()

  constructor(private readonly client: ServiceClient) {
    super()
  }

  async findEmployeeIdByUserId(userId: string): Promise<string | null> {
    const now = Date.now()
    const cached = this.employeeOf.get(userId)
    if (cached !== undefined && cached.expiresAt > now) return cached.id
    const id = await this.fetchEmployeeId(userId)
    if (this.employeeOf.size >= EMPLOYEE_CACHE_MAX) this.employeeOf.clear()
    this.employeeOf.set(userId, { id, expiresAt: now + EMPLOYEE_CACHE_TTL_MS })
    return id
  }

  private async fetchEmployeeId(userId: string): Promise<string | null> {
    const data = await this.client.getData(
      URL_KEY,
      `/employees/by-user/${encodeURIComponent(userId)}`,
    )
    const employeeId = field(data, 'employeeId')
    if (employeeId === null) return null
    if (typeof employeeId === 'string') return employeeId
    return this.client.malformed(URL_KEY)
  }

  async employeeExists(id: string): Promise<boolean> {
    const data = await this.client.getData(
      URL_KEY,
      `/employees/${encodeURIComponent(id)}/exists`,
    )
    const exists = field(data, 'exists')
    if (typeof exists === 'boolean') return exists
    return this.client.malformed(URL_KEY)
  }
}

function field(data: unknown, key: string): unknown {
  return data !== null && typeof data === 'object' && key in data
    ? (data as Record<string, unknown>)[key]
    : undefined
}
