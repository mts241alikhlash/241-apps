import { ServiceUnavailableException } from '@nestjs/common'
import type { ServiceClient } from '@mts241alikhlash/nest-core/service-client'
import {
  EMPLOYEE_CACHE_TTL_MS,
  HttpEmployeeIdentityAdapter,
} from './http-employee-identity.adapter.js'

function build(data: (path: string) => unknown) {
  const getData = vi.fn((_key: string, path: string) =>
    Promise.resolve(data(path)),
  )
  const malformed = vi.fn((): never => {
    throw new ServiceUnavailableException('malformed')
  })
  const client = { getData, malformed } as unknown as ServiceClient
  return { adapter: new HttpEmployeeIdentityAdapter(client), getData }
}

describe('HttpEmployeeIdentityAdapter', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('asks hr-service once for a user and answers repeats from memory', async () => {
    const { adapter, getData } = build(() => ({ employeeId: 'emp-1' }))

    expect(await adapter.findEmployeeIdByUserId('user-1')).toBe('emp-1')
    expect(await adapter.findEmployeeIdByUserId('user-1')).toBe('emp-1')

    expect(getData).toHaveBeenCalledTimes(1)
  })

  it('remembers that a user has no employee record', async () => {
    const { adapter, getData } = build(() => ({ employeeId: null }))

    expect(await adapter.findEmployeeIdByUserId('user-1')).toBeNull()
    expect(await adapter.findEmployeeIdByUserId('user-1')).toBeNull()

    expect(getData).toHaveBeenCalledTimes(1)
  })

  it('asks again once the remembered answer is stale', async () => {
    vi.useFakeTimers()
    const { adapter, getData } = build(() => ({ employeeId: 'emp-1' }))

    await adapter.findEmployeeIdByUserId('user-1')
    vi.advanceTimersByTime(EMPLOYEE_CACHE_TTL_MS + 1)
    await adapter.findEmployeeIdByUserId('user-1')

    expect(getData).toHaveBeenCalledTimes(2)
  })

  it('does not remember a failed lookup', async () => {
    const getData = vi
      .fn()
      .mockRejectedValueOnce(new ServiceUnavailableException('hr busy'))
      .mockResolvedValueOnce({ employeeId: 'emp-1' })
    const client = {
      getData,
      malformed: vi.fn(),
    } as unknown as ServiceClient
    const adapter = new HttpEmployeeIdentityAdapter(client)

    await expect(adapter.findEmployeeIdByUserId('user-1')).rejects.toThrow(
      ServiceUnavailableException,
    )
    expect(await adapter.findEmployeeIdByUserId('user-1')).toBe('emp-1')
  })
})
