import { beforeEach, describe, expect, it, vi } from 'vitest'
import createClient from 'openapi-fetch'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import api from './api'
import { toast } from 'vue-sonner'
import { getAccessToken, setAccessToken } from './auth-session'
import {
  ServiceRequestError,
  createServiceClient,
  unwrap,
  unwrapBlob,
  unwrapPage,
} from './service-client'
import { getIndonesianErrorMessage } from './error-handler'

vi.mock('vue-sonner', () => ({ toast: { error: vi.fn() } }))
vi.hoisted(() => vi.stubEnv('VITE_API_BASE_URL', 'http://api.test'))
const postMock = vi.hoisted(() => vi.fn())
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return {
    ...actual,
    default: Object.assign(actual.default, { post: postMock }),
  }
})

const fetchMock = vi.fn()
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

function client() {
  return createServiceClient<any>((o) => createClient<any>(o)) as any
}

beforeEach(() => {
  fetchMock.mockReset()
  postMock.mockReset()
  vi.mocked(toast.error).mockClear()
  postMock.mockResolvedValue({ data: { accessToken: 't2' } })
  vi.stubGlobal('fetch', fetchMock)
  setAccessToken('t1')
})

describe('createServiceClient', () => {
  it('sends bearer token and credentials', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: 1 }))
    await client().GET('/x')
    const req = fetchMock.mock.calls[0]![0] as Request
    expect(req.headers.get('authorization')).toBe('Bearer t1')
    expect(req.credentials).toBe('include')
  })

  it('refreshes once on 401 and retries with same body', async () => {
    setAccessToken('t1')
    const calls: Array<{ url: string; auth: string | null; body: string }> = []
    let n = 0
    fetchMock.mockImplementation(async (input: Request) => {
      calls.push({
        url: input.url,
        auth: input.headers.get('authorization'),
        body: await input.clone().text(),
      })
      return n++ === 0 ? json(401, {}) : json(200, { data: 'ok' })
    })
    const res = await client().POST('/x', { body: { a: 1 } })
    expect(res.data).toEqual({ data: 'ok' })
    expect(calls).toHaveLength(2)
    expect(calls[1]!.auth).toBe('Bearer t2')
    expect(calls[1]!.body).toBe(calls[0]!.body)
  })

  it('does not refresh again on second 401', async () => {
    fetchMock.mockImplementation(async () => {
      return json(401, {})
    })
    const res = await client().GET('/x')
    expect(res.response.status).toBe(401)
    expect(postMock).toHaveBeenCalledTimes(1)
  })

  it('retries FormData with full body and no manual content-type', async () => {
    const seen: Array<{ ct: string | null; body: string }> = []
    let n = 0
    fetchMock.mockImplementation(async (input: Request) => {
      const text = await input.clone().text()
      seen.push({ ct: input.headers.get('content-type'), body: text })
      return n++ === 0 ? json(401, {}) : json(200, { data: 'ok' })
    })
    const fd = new FormData()
    fd.append('f', 'hello')
    const res = await client().POST('/x', {
      body: fd,
      bodySerializer: (b: FormData) => b,
    })
    expect(res.data).toEqual({ data: 'ok' })
    expect(seen[1]!.body).toContain('hello')
    expect(seen[0]!.ct).toMatch(/^multipart\/form-data; boundary=/)
  })

  it('passes a network failure of the retry to the caller', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, {}))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const err: any = await unwrap(client().GET('/x')).catch((e: any) => e)
    expect(err).toBeInstanceOf(ServiceRequestError)
    expect(err.code).toBe('ERR_NETWORK')
    expect(toast.error).not.toHaveBeenCalled()
    expect(getAccessToken()).toBe('t2')
  })

  it('ends the session when the refresh fails', async () => {
    vi.useFakeTimers()
    postMock.mockRejectedValue(
      new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, null, {
        status: 401,
        statusText: '',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
        data: {},
      }),
    )
    fetchMock.mockResolvedValueOnce(json(401, {}))
    const err: any = await unwrap(client().GET('/x')).catch((e: any) => e)
    expect(err).toBeInstanceOf(ServiceRequestError)
    expect(err.response.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBeNull()
    expect(toast.error).toHaveBeenCalledWith(
      'Sesi telah berakhir',
      expect.anything(),
    )
    vi.useRealTimers()
  })

  it('refreshes once for parallel 401s from axios and fetch', async () => {
    let release = () => {}
    postMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: { accessToken: 't2' } })
        }),
    )
    api.defaults.adapter = (config: InternalAxiosRequestConfig) => {
      const response = {
        data: 'axios-ok',
        status: 200,
        statusText: '',
        headers: {},
        config,
      }
      if (config.headers.Authorization === 'Bearer t2') {
        return Promise.resolve(response)
      }
      return Promise.reject(
        new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, {
          ...response,
          status: 401,
        }),
      )
    }
    fetchMock.mockImplementation(async (input: Request) =>
      input.headers.get('authorization') === 'Bearer t2'
        ? json(200, { data: 'fetch-ok' })
        : json(401, {}),
    )
    const both = Promise.all([api.get('/a'), unwrap(client().GET('/x'))])
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
      expect(postMock).toHaveBeenCalled()
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    release()
    const [a, b] = await both
    expect(a.data).toBe('axios-ok')
    expect(b).toBe('fetch-ok')
    expect(postMock).toHaveBeenCalledTimes(1)
  })

  it('never refreshes for /auth/ paths', async () => {
    fetchMock.mockResolvedValueOnce(json(401, {}))
    const res = await client().POST('/auth/refresh')
    expect(res.response.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(postMock).not.toHaveBeenCalled()
  })
})

describe('unwrap', () => {
  it('returns undefined for 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    expect(await unwrap(client().DELETE('/x'))).toBeUndefined()
  })

  it('returns data.data', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { id: 1 } }))
    expect(await unwrap(client().GET('/x'))).toEqual({ id: 1 })
  })

  it('throws ServiceRequestError with server message', async () => {
    fetchMock.mockResolvedValueOnce(
      json(422, { code: 'PRESET_LOCKED', message: 'x' }),
    )
    const err: any = await unwrap(client().GET('/x')).catch((e: any) => e)
    expect(err).toBeInstanceOf(ServiceRequestError)
    expect(err.code).toBe('PRESET_LOCKED')
    expect(err.response.status).toBe(422)
    expect(getIndonesianErrorMessage(err, 'f')).not.toBe('f')
  })

  it('maps network TypeError to ERR_NETWORK', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const err: any = await unwrap(client().GET('/x')).catch((e: any) => e)
    expect(err).toBeInstanceOf(ServiceRequestError)
    expect(err.code).toBe('ERR_NETWORK')
    expect(getIndonesianErrorMessage(err, 'f')).toMatch(/tidak/i)
  })
})

describe('unwrapPage', () => {
  it('fills missing meta fields with defaults', async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, { data: [1], meta: { total: 5 } }),
    )
    expect(await unwrapPage(client().GET('/x'))).toEqual({
      data: [1],
      meta: { total: 5, page: 1, limit: 0 },
    })
  })

  it('defaults the whole meta when absent', async () => {
    fetchMock.mockResolvedValueOnce(json(200, {}))
    expect(await unwrapPage(client().GET('/x'))).toEqual({
      data: [],
      meta: { total: 0, page: 1, limit: 0 },
    })
  })
})

describe('unwrapBlob', () => {
  it('reads failure body as JSON error', async () => {
    fetchMock.mockResolvedValueOnce(json(403, { message: 'nope' }))
    const err: any = await unwrapBlob(
      client().GET('/x', { parseAs: 'blob' }),
    ).catch((e: any) => e)
    expect(err).toBeInstanceOf(ServiceRequestError)
    expect(err.response.data.message).toBe('nope')
  })

  it('returns blob', async () => {
    fetchMock.mockResolvedValueOnce(new Response('abc', { status: 200 }))
    const b = await unwrapBlob(client().GET('/x', { parseAs: 'blob' }))
    expect(await b.text()).toBe('abc')
  })
})
