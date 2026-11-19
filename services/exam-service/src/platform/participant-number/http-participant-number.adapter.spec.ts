import { ServiceUnavailableException } from '@nestjs/common'
import type { ServiceClient } from '@mts241alikhlash/nest-core/service-client'
import { HttpParticipantNumberAdapter } from './http-participant-number.adapter.js'

function build(answer: unknown, bulkAnswer: unknown = []) {
  const getData = vi.fn((_key: string, _path: string) =>
    Promise.resolve(answer),
  )
  const malformed = vi.fn((): never => {
    throw new ServiceUnavailableException('malformed')
  })
  const postData = vi.fn((_key: string, _path: string, _body: unknown) =>
    Promise.resolve(
      _path === '/students/participant-numbers/lookup'
        ? bulkAnswer
        : { issued: 0, skipped: [] },
    ),
  )
  const client = { getData, postData, malformed } as unknown as ServiceClient
  return {
    adapter: new HttpParticipantNumberAdapter(client),
    getData,
    postData,
  }
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

  it('asks student-service to issue the semester’s numbers', async () => {
    const { adapter, postData } = build(null)
    postData.mockResolvedValueOnce({ issued: 2, skipped: [] })

    await adapter.issueNumbers('sem 1')

    expect(postData).toHaveBeenCalledWith(
      'STUDENT_SERVICE_URL',
      '/students/participant-numbers/issue',
      { semesterId: 'sem 1' },
    )
  })

  it('maps the issue answer to the count and the skipped students', async () => {
    const { adapter, postData } = build(null)
    postData.mockResolvedValueOnce({ issued: 2, skipped: ['stu-9'] })

    await expect(adapter.issueNumbers('sem-1')).resolves.toEqual({
      issued: 2,
      skipped: ['stu-9'],
    })
  })

  it('treats an issue answer of the wrong shape as malformed', async () => {
    const shapes = [
      { issued: '2', skipped: [] },
      { issued: 2, skipped: [1] },
      { issued: 2 },
      null,
    ]
    for (const shape of shapes) {
      const { adapter, postData } = build(null)
      postData.mockResolvedValueOnce(shape)
      await expect(adapter.issueNumbers('sem-1')).rejects.toThrow('malformed')
    }
  })

  it('looks up the numbers of many students with one POST', async () => {
    const { adapter, postData } = build(null, [
      { studentId: 'a', number: '241-1' },
      { studentId: 'c', number: '241-3' },
    ])

    const numbers = await adapter.findNumbers(['a', 'b', 'c'], 'sem 1')

    expect(postData).toHaveBeenCalledTimes(1)
    expect(postData).toHaveBeenCalledWith(
      'STUDENT_SERVICE_URL',
      '/students/participant-numbers/lookup',
      { semesterId: 'sem 1', studentIds: ['a', 'b', 'c'] },
    )
    expect(numbers).toEqual(
      new Map([
        ['a', '241-1'],
        ['c', '241-3'],
      ]),
    )
  })

  it('splits more than 500 students into chunks and merges the answers', async () => {
    const ids = Array.from({ length: 1200 }, (_, i) => `stu-${i}`)
    const { adapter, postData } = build(null, [])
    postData.mockImplementation((_key, _path, body) => {
      const { studentIds } = body as { studentIds: string[] }
      return Promise.resolve(
        studentIds.map((studentId) => ({
          studentId,
          number: `n-${studentId}`,
        })),
      )
    })

    const numbers = await adapter.findNumbers(ids, 'sem-1')

    expect(
      postData.mock.calls.map(
        ([, , body]) => (body as { studentIds: string[] }).studentIds.length,
      ),
    ).toEqual([500, 500, 200])
    expect(numbers.size).toBe(1200)
    expect(numbers.get('stu-1199')).toBe('n-stu-1199')
  })

  it('makes no call and returns an empty map for an empty list', async () => {
    const { adapter, postData } = build(null)

    await expect(adapter.findNumbers([], 'sem-1')).resolves.toEqual(new Map())
    expect(postData).not.toHaveBeenCalled()
  })

  it('treats a bulk answer of the wrong shape as malformed', async () => {
    await expect(
      build(null, [{ studentId: 'a', number: 241 }]).adapter.findNumbers(
        ['a'],
        'sem-1',
      ),
    ).rejects.toThrow('malformed')
    await expect(
      build(null, { studentId: 'a', number: '1' }).adapter.findNumbers(
        ['a'],
        'sem-1',
      ),
    ).rejects.toThrow('malformed')
  })
})
