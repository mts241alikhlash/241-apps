import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET, PUT, POST } = vi.hoisted(() => ({
  GET: vi.fn(),
  PUT: vi.fn(),
  POST: vi.fn(),
}))

vi.mock('@/shared/api/clients', () => ({ examClient: { GET, PUT, POST } }))

import { examOfflineApi } from './examOfflineApi'

const ok = (body: unknown, headers: Record<string, string> = {}) => ({
  data: body,
  response: new Response(null, { status: 200, headers }),
})

beforeEach(() => vi.clearAllMocks())

describe('examOfflineApi', () => {
  it('lists the offline schedules', async () => {
    GET.mockResolvedValue(ok({ data: [{ scheduleId: 's1' }] }))
    await expect(examOfflineApi.schedules()).resolves.toEqual([
      { scheduleId: 's1' },
    ])
    expect(GET).toHaveBeenCalledWith('/exam-offline/schedules')
  })

  it('reads the roster of one schedule', async () => {
    GET.mockResolvedValue(ok({ data: [{ studentId: 'a' }] }))
    await expect(examOfflineApi.roster('s1')).resolves.toEqual([
      { studentId: 'a' },
    ])
    expect(GET).toHaveBeenCalledWith('/exam-offline/schedules/{id}/roster', {
      params: { path: { id: 's1' } },
    })
  })

  it('saves the score of one student', async () => {
    PUT.mockResolvedValue(ok({ data: { studentId: 'a', rawScore: 40 } }))
    await examOfflineApi.save('s1', 'a', { rawScore: 40 })
    expect(PUT).toHaveBeenCalledWith(
      '/exam-offline/schedules/{id}/students/{studentId}',
      {
        params: { path: { id: 's1', studentId: 'a' } },
        body: { rawScore: 40 },
      },
    )
  })

  it('uploads the filled sheet as the file field of a form', async () => {
    POST.mockResolvedValue(
      ok({ data: { saved: 1, rejected: [], skipped: [] } }),
    )
    const file = new File(['x'], 'nilai.xlsx')
    await expect(examOfflineApi.importScores('s1', file)).resolves.toEqual({
      saved: 1,
      rejected: [],
      skipped: [],
    })
    const [path, init] = POST.mock.calls[0]
    expect(path).toBe('/exam-offline/schedules/{id}/import')
    expect(init.params).toEqual({ path: { id: 's1' } })
    expect((init.body as FormData).get('file')).toBe(file)
  })

  it('downloads the sheet with the file name the server gives', async () => {
    const blob = new Blob(['x'])
    GET.mockResolvedValue(
      ok(blob, {
        'content-disposition':
          'attachment; filename="score-sheet-tafsir-vii-a.xlsx"',
      }),
    )
    await expect(examOfflineApi.sheet('s1')).resolves.toEqual({
      blob,
      fileName: 'score-sheet-tafsir-vii-a.xlsx',
    })
    expect(GET).toHaveBeenCalledWith('/exam-offline/schedules/{id}/sheet', {
      params: { path: { id: 's1' } },
      parseAs: 'blob',
    })
  })

  it('falls back to a plain name when the server gives none', async () => {
    GET.mockResolvedValue(ok(new Blob(['x'])))
    const { fileName } = await examOfflineApi.sheet('s1')
    expect(fileName).toBe('score-sheet.xlsx')
  })

  it('asks to send the scores, confirming the missing ones when told', async () => {
    POST.mockResolvedValue(ok({ data: { queued: 3, missing: 1, absent: 0 } }))
    await expect(
      examOfflineApi.publish('s1', { confirmMissing: true }),
    ).resolves.toEqual({ queued: 3, missing: 1, absent: 0 })
    expect(POST).toHaveBeenCalledWith('/exam-offline/schedules/{id}/publish', {
      params: { path: { id: 's1' } },
      body: { confirmMissing: true },
    })
  })
})
