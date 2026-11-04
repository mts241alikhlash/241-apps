import axios from 'axios'
import { API_BASE_URL } from '@mts241alikhlash/web-shared/utils/api'
import { ssoService } from '@/features/platform/auth'

export function continueTarget(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('/sso/authorize?')
    ? value
    : null
}

const MESSAGES: Record<number, string> = {
  401: 'Nama pengguna atau kata sandi salah.',
  403: 'Akun pendaftar masuk lewat aplikasi PPDB.',
  429: 'Terlalu banyak percobaan. Coba lagi sebentar lagi.',
}

export const accountLoginService = {
  signIn: async (identifier: string, password: string): Promise<string> => {
    try {
      await axios.post(
        `${API_BASE_URL}/sso/login`,
        { identifier, password },
        { withCredentials: true },
      )
      return 'ok'
    } catch (error) {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined
      return (
        (status !== undefined && MESSAGES[status]) ||
        'Layanan masuk sedang tidak tersedia.'
      )
    }
  },

  continueAfterSignIn: async (value: unknown): Promise<void> => {
    const target = continueTarget(value)
    if (target) {
      window.location.assign(`${API_BASE_URL}${target}`)
      return
    }
    await ssoService.startSignIn('/')
  },

  googleUrl: (): string => `${API_BASE_URL}/sso/google`,
}
