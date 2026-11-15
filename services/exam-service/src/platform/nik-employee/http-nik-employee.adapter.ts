import { Injectable } from '@nestjs/common'
import { ServiceClient } from '@mts241alikhlash/nest-core/service-client'
import { INikEmployeePort } from './nik-employee.port.js'

const IDENTITY_URL_KEY = 'IDENTITY_SERVICE_URL'
const HR_URL_KEY = 'HR_SERVICE_URL'

@Injectable()
export class HttpNikEmployeeAdapter extends INikEmployeePort {
  constructor(private readonly client: ServiceClient) {
    super()
  }

  async findEmployeeIdByNik(nik: string): Promise<string | null> {
    const account = await this.client.getData(
      IDENTITY_URL_KEY,
      `/accounts/lookup?nik=${encodeURIComponent(nik)}`,
    )
    const userId = field(account, 'nikOwnerId')
    if (userId === null) return null
    if (typeof userId !== 'string')
      return this.client.malformed(IDENTITY_URL_KEY)

    const employee = await this.client.getData(
      HR_URL_KEY,
      `/employees/by-user/${encodeURIComponent(userId)}`,
    )
    const employeeId = field(employee, 'employeeId')
    if (employeeId === null) return null
    if (typeof employeeId === 'string') return employeeId
    return this.client.malformed(HR_URL_KEY)
  }
}

function field(data: unknown, key: string): unknown {
  return data !== null && typeof data === 'object' && key in data
    ? (data as Record<string, unknown>)[key]
    : undefined
}
