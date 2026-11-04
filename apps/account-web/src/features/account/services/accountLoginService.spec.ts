import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  isAxiosError: vi.fn(),
  startSignIn: vi.fn(),
  assign: vi.fn(),
}))

vi.mock('axios', () => ({
  default: { post: mocks.post, isAxiosError: mocks.isAxiosError },
}))
vi.mock('@mts241alikhlash/web-shared/utils/api', () => ({ API_BASE_URL: '' }))
vi.mock('@/features/platform/auth', () => ({
  ssoService: { startSignIn: mocks.startSignIn },
}))

import { accountLoginService, continueTarget } from './accountLoginService'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('window', { location: { assign: mocks.assign } })
})

describe('continueTarget', () => {
  it('keeps an authorize request', () => {
    expect(continueTarget('/sso/authorize?app=hr')).toBe(
      '/sso/authorize?app=hr',
    )
  })

  it.each([
    '//evil.example/sso/authorize?',
    'https://evil.example/sso/authorize?',
    '/profile',
    undefined,
  ])('refuses %p', (value) => {
    expect(continueTarget(value)).toBeNull()
  })
})

describe('accountLoginService.signIn', () => {
  it('answers ok when the central session opens', async () => {
    mocks.post.mockResolvedValue({ status: 204 })

    await expect(accountLoginService.signIn('guru', 'x')).resolves.toBe('ok')
    expect(mocks.post).toHaveBeenCalledWith(
      '/sso/login',
      { identifier: 'guru', password: 'x' },
      { withCredentials: true },
    )
  })

  it.each([
    [401, 'Nama pengguna atau kata sandi salah.'],
    [403, 'Akun pendaftar masuk lewat aplikasi PPDB.'],
    [429, 'Terlalu banyak percobaan. Coba lagi sebentar lagi.'],
    [503, 'Layanan masuk sedang tidak tersedia.'],
  ])('explains a %i', async (status, message) => {
    mocks.post.mockRejectedValue({ response: { status } })
    mocks.isAxiosError.mockReturnValue(true)

    await expect(accountLoginService.signIn('guru', 'x')).resolves.toBe(message)
  })
})

describe('accountLoginService.continueAfterSignIn', () => {
  it('resumes the authorize request that sent the person here', async () => {
    await accountLoginService.continueAfterSignIn('/sso/authorize?app=hr')

    expect(mocks.assign).toHaveBeenCalledWith('/sso/authorize?app=hr')
    expect(mocks.startSignIn).not.toHaveBeenCalled()
  })

  it('signs in to accounts itself otherwise', async () => {
    await accountLoginService.continueAfterSignIn('https://evil.example')

    expect(mocks.assign).not.toHaveBeenCalled()
    expect(mocks.startSignIn).toHaveBeenCalledWith('/')
  })
})
