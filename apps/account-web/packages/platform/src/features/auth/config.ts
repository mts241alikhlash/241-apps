import { ref } from 'vue'

interface AuthConfig {
  appKey: string
  appTitle: string
  appSubtitle: string
  logoAlt: string
  loginTitle: string
  loginSubtitle: string
  identifierLabel: string
  homeRoute: string
  ssoApp: string
  signUpUrl: string | null
  signUpLabel: string
  ensureApplicantApplication: () => Promise<unknown>
}

export const authConfig = ref<AuthConfig>({
  appKey: 'ACADEMIC',
  appTitle: '241 Apps',
  appSubtitle: 'Sistem Informasi Akademik',
  logoAlt: '241 Apps Logo',
  loginTitle: 'Masuk ke 241 Apps',
  loginSubtitle: 'Masukkan kredensial Anda untuk melanjutkan',
  identifierLabel: 'ID Pengguna',
  homeRoute: '/',
  ssoApp: '',
  signUpUrl: null,
  signUpLabel: 'Belum punya akun?',
  ensureApplicantApplication: () => Promise.resolve(null),
})

export function configureAuth(config: Partial<typeof authConfig.value>) {
  authConfig.value = { ...authConfig.value, ...config }
}
