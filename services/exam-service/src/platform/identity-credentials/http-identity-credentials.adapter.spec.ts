import { ServiceUnavailableException } from '@nestjs/common'
import type { ServiceClient } from '@mts241alikhlash/nest-core/service-client'
import { HttpIdentityCredentialsAdapter } from './http-identity-credentials.adapter.js'

function build(answer: (chunk: string[]) => unknown) {
  const postData = vi.fn((_key: string, _path: string, body: unknown) =>
    Promise.resolve(answer((body as { userIds: string[] }).userIds)),
  )
  const malformed = vi.fn((): never => {
    throw new ServiceUnavailableException('malformed')
  })
  const client = { postData, malformed } as unknown as ServiceClient
  return { adapter: new HttpIdentityCredentialsAdapter(client), postData }
}

const answerAll = (ids: string[]) => ({
  data: ids.map((userId) => ({
    userId,
    identifier: `nis-${userId}`,
    password: 'Abcdefghjk',
  })),
})

describe('HttpIdentityCredentialsAdapter.resetPasswords', () => {
  it('posts the ids to the identity reset route and returns the credentials', async () => {
    const { adapter, postData } = build(answerAll)

    const result = await adapter.resetPasswords(['u1', 'u2'])

    expect(postData).toHaveBeenCalledWith(
      'IDENTITY_SERVICE_URL',
      '/accounts/passwords/reset',
      { userIds: ['u1', 'u2'] },
    )
    expect(result).toEqual([
      { userId: 'u1', identifier: 'nis-u1', password: 'Abcdefghjk' },
      { userId: 'u2', identifier: 'nis-u2', password: 'Abcdefghjk' },
    ])
  })

  it('sends at most 25 ids per call', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `u${i}`)
    const { adapter, postData } = build(answerAll)

    const result = await adapter.resetPasswords(ids)

    expect(postData).toHaveBeenCalledTimes(5)
    expect(result).toHaveLength(101)
  })

  it('refuses an answer whose rows lack a password', async () => {
    const { adapter } = build(() => ({
      data: [{ userId: 'u1', identifier: 'x' }],
    }))

    await expect(adapter.resetPasswords(['u1'])).rejects.toThrow(
      ServiceUnavailableException,
    )
  })
})
