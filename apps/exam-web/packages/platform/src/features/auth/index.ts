export { authConfig, configureAuth } from './config'
export { authApi } from './api/authApi'
export { accountApi } from './api/accountApi'
export { authService } from './services/authService'
export { authSessionService } from './services/authSessionService'
export { authIdentityService } from './services/authIdentityService'
export { authProfileService } from './services/authProfileService'
export { accountService } from './services/accountService'
export { useAuthStore } from './stores/authStore'
export { useAuthLogin } from './composables/useAuthLogin'
export { useAuthSession } from './composables/useAuthSession'
export { useRoleGuard } from './composables/useRoleGuard'
export { useLoginForm } from './composables/useLoginForm'
export { authRoutes, ssoAuthRoutes } from './routes'
export { ssoService, safeTarget } from './services/ssoService'
export { useSsoApps } from './composables/useSsoApps'
export { default as AppSwitcher } from './components/AppSwitcher.vue'
export { default as SsoLoginView } from './views/SsoLoginView.vue'
export { default as OAuthCallbackView } from './views/OAuthCallbackView.vue'
export type { SsoApp } from './types'
export { default as NotFoundView } from './views/NotFoundView.vue'
export type {
  AuthUser,
  AuthProfile,
  LoginResponse,
  LogoutResponse,
  RefreshTokenResponse,
  SessionIdentity,
  LoginPayload,
  ChangePasswordPayload,
  AuthChangePasswordPayload,
  ResetPasswordPayload,
  ProfileEnvelope,
  ExtractEnvelope,
} from './types'
