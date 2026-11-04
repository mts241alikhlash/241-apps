import type { RouteRecordRaw } from 'vue-router'

export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('./views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('./views/ForgotPasswordView.vue'),
    meta: { guestOnly: true, title: 'Lupa Password' },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('./views/ResetPasswordView.vue'),
    meta: { guestOnly: true, title: 'Reset Password' },
  },
  {
    path: '/oauth/callback',
    name: 'oauth-callback',
    component: () => import('./views/OAuthCallbackView.vue'),
    meta: { title: 'Masuk dengan Google' },
  },
]

export const ssoAuthRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('./views/SsoLoginView.vue'),
    meta: { guestOnly: true, title: 'Masuk' },
  },
  {
    path: '/oauth/callback',
    name: 'oauth-callback',
    component: () => import('./views/OAuthCallbackView.vue'),
    meta: { title: 'Masuk' },
  },
]
