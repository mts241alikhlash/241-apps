import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  setAccessToken: vi.fn(),
  fetchIdentity: vi.fn(),
  persistUser: vi.fn(),
  setUser: vi.fn(),
  assign: vi.fn(),
}))

vi.mock('axios', () => ({ default: { post: mocks.post } }))
vi.mock('@mts241alikhlash/web-shared/utils/api', () => ({
  API_BASE_URL: '',
  setAccessToken: mocks.setAccessToken,
}))
vi.mock('./authIdentityService', () => ({
  authIdentityService: { fetchIdentity: mocks.fetchIdentity },
}))
vi.mock('./authSessionService', () => ({
  authSessionService: { persistUser: mocks.persistUser },
}))
vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({ setUser: mocks.setUser }),
}))

import { configureAuth } from '../config'
import { challengeFor } from './pkce'
import { safeTarget, ssoService } from './ssoService'

const stored = new Map<string, string>()

function pending(): { state: string; verifier: string; target: string } {
  return JSON.parse(stored.get('sso_pending') ?? 'null') as {
    state: string
    verifier: string
    target: string
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  stored.clear()
  vi.stubGlobal('window', {
    location: { origin: 'https://hr.test', assign: mocks.assign },
    sessionStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
      removeItem: (key: string) => void stored.delete(key),
    },
  })
  configureAuth({ ssoApp: 'hr', homeRoute: '/home' })
})

describe('safeTarget', () => {
  it.each(['/payroll', '/a?b=c'])('keeps %s', (value) => {
    expect(safeTarget(value, '/home')).toBe(value)
  })

  it.each(['//evil.example', 'https://evil.example', '/\\evil.example', 5])(
    'replaces %p with the fallback',
    (value) => {
      expect(safeTarget(value, '/home')).toBe('/home')
    },
  )
})

describe('ssoService.startSignIn', () => {
  it('sends the browser to /sso/start with a PKCE challenge it can prove', async () => {
    await ssoService.startSignIn('/payroll')

    const url = new URL(
      mocks.assign.mock.calls[0][0] as string,
      'https://hr.test',
    )
    expect(url.pathname).toBe('/sso/start')
    expect(url.searchParams.get('app')).toBe('hr')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://hr.test/oauth/callback',
    )
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('state')).toBe(pending().state)
    expect(url.searchParams.get('code_challenge')).toBe(
      await challengeFor(pending().verifier),
    )
    expect(pending().target).toBe('/payroll')
  })

  it('never keeps an off-site target', async () => {
    await ssoService.startSignIn('https://evil.example')

    expect(pending().target).toBe('/home')
  })
})

describe('ssoService.completeSignIn', () => {
  beforeEach(async () => {
    await ssoService.startSignIn('/payroll')
  })

  it('trades the code, stores the session and returns the target', async () => {
    const { state, verifier } = pending()
    mocks.post.mockResolvedValue({ data: { data: { accessToken: 'access' } } })
    mocks.fetchIdentity.mockResolvedValue({ id: 'u1' })

    await expect(ssoService.completeSignIn('the-code', state)).resolves.toBe(
      '/payroll',
    )
    expect(mocks.post).toHaveBeenCalledWith(
      '/sso/exchange',
      {
        code: 'the-code',
        code_verifier: verifier,
        redirect_uri: 'https://hr.test/oauth/callback',
      },
      { withCredentials: true },
    )
    expect(mocks.setAccessToken).toHaveBeenCalledWith('access')
    expect(mocks.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(stored.has('sso_pending')).toBe(false)
  })

  it('refuses a state it did not issue, without calling the server', async () => {
    await expect(
      ssoService.completeSignIn('the-code', 'forged'),
    ).resolves.toBeNull()
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('cannot be completed twice', async () => {
    const { state } = pending()
    mocks.post.mockResolvedValue({ data: { data: { accessToken: 'access' } } })
    mocks.fetchIdentity.mockResolvedValue({ id: 'u1' })
    await ssoService.completeSignIn('the-code', state)

    await expect(
      ssoService.completeSignIn('the-code', state),
    ).resolves.toBeNull()
  })

  it('answers null when the server refuses the code', async () => {
    mocks.post.mockRejectedValue(new Error('400'))

    await expect(
      ssoService.completeSignIn('the-code', pending().state),
    ).resolves.toBeNull()
  })
})

describe('ssoService.accountsUrl', () => {
  it('goes through /sso/accounts', () => {
    expect(ssoService.accountsUrl('/profile?from=hr')).toBe(
      '/sso/accounts?path=%2Fprofile%3Ffrom%3Dhr',
    )
  })
})
