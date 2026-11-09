import { ServiceUnavailableException } from '@nestjs/common'
import type { ServiceClient } from '@mts241alikhlash/nest-core/service-client'
import { HttpParticipantNumberAdapter } from './http-participant-number.adapter.js'

function build(answer: unknown) {
  const getData = vi.fn((_key: string, _path: string) =>
    Promise.resolve(answer),
  )
  const malformed = vi.fn((): never => {
    throw new ServiceUnavailableException('malformed')
  })
  const client = { getData, malformed } as unknown as ServiceClient
  return { adapter: new HttpParticipantNumberAdapter(client), getData }
}

describe('HttpParticipantNumberAdapter', () => {
  it('asks student-service for the number of that semester', async () => {
    const { adapter, getData } = build({ number: '241-261-08-001' })

    await expect(adapter.findNumber('stu 1', 'sem 1')).resolves.toBe(
      '241-261-08-001',
    )
    expect(getData).toHaveBeenCalledWith(
      'STUDENT_SERVICE_URL',
      '/students/by-id/stu%201/participant-number?semesterId=sem%201',
    )
  })

  it('answers null when the registry has no number', async () => {
    await expect(
      build({ number: null }).adapter.findNumber('stu-1', 'sem-1'),
    ).resolves.toBeNull()
    await expect(
      build(null).adapter.findNumber('stu-1', 'sem-1'),
    ).resolves.toBeNull()
  })

  it('treats an answer of the wrong shape as malformed', async () => {
    await expect(
      build({ number: 241 }).adapter.findNumber('stu-1', 'sem-1'),
    ).rejects.toThrow('malformed')
  })
})
