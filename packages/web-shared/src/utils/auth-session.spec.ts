import axios from 'axios'
import { toast } from 'vue-sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearSession,
  getAccessToken,
  handleRefreshFailure,
  refreshAccessToken,
  setAccessToken,
} from './auth-session'

vi.mock('axios', () => ({ default: { post: vi.fn() } }))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn() } }))

const post = vi.mocked(axios.post)
const toastError = vi.mocked(toast.error)

beforeEach(() => {
  vi.clearAllMocks()
  clearSession()
})

describe('refreshAccessToken', () => {
  it('shares one refresh between parallel callers', async () => {
    post.mockResolvedValue({ data: { data: { accessToken: 'new' } } })

    const [a, b] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
    ])

    expect(post).toHaveBeenCalledTimes(1)
    expect(a).toBe('new')
    expect(b).toBe('new')
  })

  it('stores the new token', async () => {
    post.mockResolvedValue({ data: { accessToken: 'fresh' } })
    await refreshAccessToken()
    expect(getAccessToken()).toBe('fresh')
  })

  it('throws the original error and allows a later refresh', async () => {
    const failure = { response: { status: 401 } }
    post.mockRejectedValueOnce(failure)
    await expect(refreshAccessToken()).rejects.toBe(failure)

    post.mockResolvedValueOnce({ data: { accessToken: 'again' } })
    await expect(refreshAccessToken()).resolves.toBe('again')
  })
})

describe('handleRefreshFailure', () => {
  it('keeps the session and warns on an outage', () => {
    setAccessToken('keep')
    handleRefreshFailure({ response: { status: 503 } })

    expect(getAccessToken()).toBe('keep')
    expect(toastError).toHaveBeenCalledWith(
      'Layanan sedang tidak tersedia',
      expect.objectContaining({ duration: 6000 }),
    )
  })

  it('clears the session and announces expiry on a 401', () => {
    vi.useFakeTimers()
    setAccessToken('gone')
    handleRefreshFailure({ response: { status: 401 } })

    expect(getAccessToken()).toBeNull()
    expect(toastError).toHaveBeenCalledWith('Sesi telah berakhir', {
      description: 'Kamu akan diarahkan ke halaman login.',
      duration: 4000,
    })
    vi.useRealTimers()
  })

  it('redirects to /login after 1500 ms', () => {
    vi.useFakeTimers()
    const location = { pathname: '/exams', href: '/exams' }
    vi.stubGlobal('window', { location, localStorage: { removeItem: vi.fn() } })

    handleRefreshFailure({ response: { status: 401 } })
    vi.advanceTimersByTime(1499)
    expect(location.href).toBe('/exams')
    vi.advanceTimersByTime(1)
    expect(location.href).toBe('/login')

    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('does not redirect when already on /login', () => {
    vi.useFakeTimers()
    const location = { pathname: '/login', href: '/login?x=1' }
    vi.stubGlobal('window', { location, localStorage: { removeItem: vi.fn() } })

    handleRefreshFailure({ response: { status: 401 } })
    vi.advanceTimersByTime(2000)
    expect(location.href).toBe('/login?x=1')

    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('reports one error only once', () => {
    const failure = { response: { status: 401 } }
    handleRefreshFailure(failure)
    handleRefreshFailure(failure)
    expect(toastError).toHaveBeenCalledTimes(1)
  })
})
