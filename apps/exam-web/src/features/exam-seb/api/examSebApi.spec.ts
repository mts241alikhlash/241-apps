import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET, POST, PATCH, DELETE } = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn(),
}))

vi.mock('@/shared/api/clients', () => ({
  examClient: { GET, POST, PATCH, DELETE },
}))

import { examSebApi } from './examSebApi'

const ok = (data: unknown) => ({
  data: { data },
  response: new Response(null, { status: 200 }),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('examSebApi', () => {
  it('lists the configurations', async () => {
    GET.mockResolvedValue(ok([{ id: 'a' }]))
    await expect(examSebApi.list()).resolves.toEqual([{ id: 'a' }])
    expect(GET).toHaveBeenCalledWith('/seb-configs')
  })

  it('sends name, configKey and file as multipart form data', async () => {
    POST.mockResolvedValue(ok({ id: 'a' }))
    const file = new File(['x'], 'ujian.seb', { type: 'application/seb' })
    await examSebApi.create({ name: 'Ujian', configKey: 'k1', file })
    const [path, init] = POST.mock.calls[0]
    expect(path).toBe('/seb-configs')
    const form = init.body as FormData
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('name')).toBe('Ujian')
    expect(form.get('configKey')).toBe('k1')
    expect(form.get('file')).toBe(file)
  })

  it('patches only the given fields', async () => {
    PATCH.mockResolvedValue(ok({ id: 'a', active: false }))
    await examSebApi.update('a', { active: false })
    expect(PATCH).toHaveBeenCalledWith('/seb-configs/{id}', {
      params: { path: { id: 'a' } },
      body: { active: false },
    })
  })

  it('deletes one configuration', async () => {
    DELETE.mockResolvedValue(ok(null))
    await examSebApi.remove('a')
    expect(DELETE).toHaveBeenCalledWith('/seb-configs/{id}', {
      params: { path: { id: 'a' } },
    })
  })

  it('checks the proof', async () => {
    POST.mockResolvedValue(ok({ matched: true, configName: 'Ujian' }))
    const seb = { configKeyHash: 'h', pageUrl: 'https://x/my-exams' }
    await expect(examSebApi.check({ seb })).resolves.toEqual({
      matched: true,
      configName: 'Ujian',
    })
    expect(POST).toHaveBeenCalledWith('/seb-configs/check', { body: { seb } })
  })
})
