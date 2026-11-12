import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import { toast } from 'vue-sonner'
import { clearSession, getAccessToken, setAccessToken } from './auth-session'

vi.mock('vue-sonner', () => ({ toast: { error: vi.fn() } }))

const calls: { url: string; auth?: string }[] = []
let alwaysUnauthorized = false
let retryStatus = 200

function adapter(config: InternalAxiosRequestConfig) {
  const auth = config.headers.Authorization as string | undefined
  calls.push({ url: config.url ?? '', auth })
  const respond = (status: number, data: unknown) => {
    const response = { data, status, statusText: '', headers: {}, config }
    if (status < 400) return Promise.resolve(response)
    return Promise.reject(
      new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, response),
    )
  }
  if (config.url?.endsWith('/auth/refresh')) {
    return respond(200, { accessToken: 'new' })
  }
  if (!alwaysUnauthorized && auth === 'Bearer new') {
    return respond(
      retryStatus,
      retryStatus < 400 ? 'ok' : { message: 'invalid' },
    )
  }
  return respond(401, {})
}

const refreshCalls = () => calls.filter((c) => c.url.endsWith('/auth/refresh'))

beforeEach(() => {
  calls.length = 0
  alwaysUnauthorized = false
  retryStatus = 200
  vi.mocked(toast.error).mockClear()
  api.defaults.adapter = adapter
  axios.defaults.adapter = adapter
  clearSession()
  setAccessToken('old')
})

describe('api refresh interceptor', () => {
  it('refreshes once for parallel 401s and retries both', async () => {
    const [a, b] = await Promise.all([api.get('/a'), api.get('/b')])

    expect(a.data).toBe('ok')
    expect(b.data).toBe('ok')
    expect(refreshCalls()).toHaveLength(1)
    expect(
      calls.filter((c) => c.auth === 'Bearer new' && !c.url.includes('auth')),
    ).toHaveLength(2)
  })

  it('does not refresh for a 401 on an /auth/ url', async () => {
    await expect(api.get('/auth/login')).rejects.toBeInstanceOf(AxiosError)
    expect(refreshCalls()).toHaveLength(0)
  })

  it('does not refresh again when the retry is also 401', async () => {
    alwaysUnauthorized = true
    await expect(api.get('/a')).rejects.toBeInstanceOf(AxiosError)
    expect(refreshCalls()).toHaveLength(1)
  })

  it('passes a failed retry to the caller without ending the session', async () => {
    retryStatus = 422
    const error = await api.get('/a').catch((e: AxiosError) => e)

    expect(error).toBeInstanceOf(AxiosError)
    expect((error as AxiosError).response?.status).toBe(422)
    expect(toast.error).not.toHaveBeenCalled()
    expect(getAccessToken()).toBe('new')
  })
})
