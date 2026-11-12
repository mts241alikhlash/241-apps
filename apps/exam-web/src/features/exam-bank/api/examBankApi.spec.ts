import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET, POST, academicGet } = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  academicGet: vi.fn(),
}))

vi.mock('@/shared/api/clients', () => ({
  examClient: { GET, POST },
  academicClient: { GET: academicGet },
}))

import { examBankApi } from './examBankApi'

const ok = (data: unknown) => ({
  data: { data },
  response: new Response(null, { status: 200 }),
})

const okBlob = (blob: Blob) => ({
  data: blob,
  response: new Response(null, { status: 200 }),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('examBankApi', () => {
  it('gets the question scope', async () => {
    GET.mockResolvedValue(ok({ all: true, employeeId: null, pairs: [] }))
    await expect(examBankApi.getScope()).resolves.toEqual({
      all: true,
      employeeId: null,
      pairs: [],
    })
    expect(GET).toHaveBeenCalledWith('/exam-questions/scope')
  })

  it('uploads an image as multipart form data', async () => {
    POST.mockResolvedValue(ok({ id: 'f1' }))
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    await expect(examBankApi.uploadImage(file)).resolves.toEqual({ id: 'f1' })
    const [path, options] = POST.mock.calls[0]
    expect(path).toBe('/exam-files')
    expect(options.body).toBeInstanceOf(FormData)
    expect((options.body as FormData).get('file')).toBe(file)
    const body = options.body
    expect(options.bodySerializer(body)).toBe(body)
  })

  it('downloads an image as a blob', async () => {
    const blob = new Blob(['x'])
    GET.mockResolvedValue(okBlob(blob))
    await expect(examBankApi.getImage('a/b')).resolves.toBe(blob)
    expect(GET).toHaveBeenCalledWith('/exam-files/{id}', {
      params: { path: { id: 'a/b' } },
      parseAs: 'blob',
    })
  })

  it('downloads the import template as a blob', async () => {
    const blob = new Blob(['x'])
    GET.mockResolvedValue(okBlob(blob))
    await expect(examBankApi.downloadTemplate('xlsx')).resolves.toBe(blob)
    expect(GET).toHaveBeenCalledWith('/exam-imports/template', {
      params: { query: { format: 'xlsx' } },
      parseAs: 'blob',
    })
  })

  it('imports questions as multipart form data', async () => {
    POST.mockResolvedValue(ok({ created: 1, questionIds: ['q'], errors: [] }))
    const form = new FormData()
    await expect(examBankApi.importQuestions(form)).resolves.toEqual({
      created: 1,
      questionIds: ['q'],
      errors: [],
    })
    const [path, options] = POST.mock.calls[0]
    expect(path).toBe('/exam-imports')
    expect(options.body).toBe(form)
    expect(options.bodySerializer(form)).toBe(form)
  })

  it('lists grades from the academic contract', async () => {
    academicGet.mockResolvedValue(ok([{ id: 'g' }]))
    const result = await examBankApi.getGrades({ limit: 5 })
    expect(result.data).toEqual([{ id: 'g' }])
    expect(academicGet).toHaveBeenCalledWith('/grades', {
      params: { query: { limit: 5 } },
    })
  })
})
