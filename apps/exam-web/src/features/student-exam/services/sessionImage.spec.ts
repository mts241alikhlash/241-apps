import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET } = vi.hoisted(() => ({ GET: vi.fn() }))

vi.mock('@/shared/api/clients', () => ({ examClient: { GET } }))

import { clearSessionImageCache, loadSessionImage } from './sessionImage'

beforeEach(() => {
  vi.clearAllMocks()
  clearSessionImageCache()
  URL.createObjectURL = vi.fn(() => 'blob:x')
})

describe('loadSessionImage', () => {
  it('fetches the image as a blob once per file', async () => {
    GET.mockResolvedValue({
      data: new Blob(['x']),
      response: new Response(null, { status: 200 }),
    })
    await expect(loadSessionImage('s', 'dev', 'f/1')).resolves.toBe('blob:x')
    await loadSessionImage('s', 'dev', 'f/1')
    expect(GET).toHaveBeenCalledTimes(1)
    expect(GET).toHaveBeenCalledWith(
      '/student-exams/{sessionId}/files/{fileId}',
      {
        params: {
          path: { sessionId: 's', fileId: 'f/1' },
          header: { 'X-Device-Id': 'dev' },
        },
        parseAs: 'blob',
      },
    )
  })
})
