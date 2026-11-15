import { ServiceUnavailableException } from '@nestjs/common'
import type { ServiceClient } from '@mts241alikhlash/nest-core/service-client'
import { HttpNikEmployeeAdapter } from './http-nik-employee.adapter.js'

function build(options: { account?: unknown; employee?: unknown }) {
  const getData = vi.fn((key: string, _path: string) => {
    if (key === 'IDENTITY_SERVICE_URL') return Promise.resolve(options.account)
    return Promise.resolve(options.employee)
  })
  const malformed = vi.fn((): never => {
    throw new ServiceUnavailableException('malformed')
  })
  const client = { getData, malformed } as unknown as ServiceClient
  return { adapter: new HttpNikEmployeeAdapter(client), getData, malformed }
}

describe('HttpNikEmployeeAdapter', () => {
  it('returns the employee id of the account owning the NIK', async () => {
    const { adapter, getData } = build({
      account: { nikOwnerId: 'user-1' },
      employee: { employeeId: 'emp-1' },
    })

    expect(await adapter.findEmployeeIdByNik('3201010101010001')).toBe('emp-1')
    expect(getData).toHaveBeenCalledWith(
      'IDENTITY_SERVICE_URL',
      '/accounts/lookup?nik=3201010101010001',
    )
    expect(getData).toHaveBeenCalledWith(
      'HR_SERVICE_URL',
      '/employees/by-user/user-1',
    )
  })

  it('returns null without calling HR when no account owns the NIK', async () => {
    const { adapter, getData } = build({
      account: { nikOwnerId: null },
    })

    expect(await adapter.findEmployeeIdByNik('3201010101010001')).toBeNull()
    expect(getData).toHaveBeenCalledTimes(1)
    expect(getData).not.toHaveBeenCalledWith(
      'HR_SERVICE_URL',
      expect.anything(),
    )
  })

  it('returns null when the account has no employee', async () => {
    const { adapter } = build({
      account: { nikOwnerId: 'user-1' },
      employee: { employeeId: null },
    })

    expect(await adapter.findEmployeeIdByNik('3201010101010001')).toBeNull()
  })

  it('throws through malformed when employeeId is not a string', async () => {
    const { adapter, malformed } = build({
      account: { nikOwnerId: 'user-1' },
      employee: { employeeId: 42 },
    })

    await expect(
      adapter.findEmployeeIdByNik('3201010101010001'),
    ).rejects.toThrow(ServiceUnavailableException)
    expect(malformed).toHaveBeenCalledWith('HR_SERVICE_URL')
  })
})
