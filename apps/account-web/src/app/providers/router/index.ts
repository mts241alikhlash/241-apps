import '@mts241alikhlash/web-shared/types/router'
import { createRouter, createWebHistory } from 'vue-router'
import {
  authRoutes,
  authSessionService,
  ssoAuthRoutes,
  useAuthStore,
} from '@/features/platform/auth'
import { profileRoutes } from '@/features/platform/profile'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'account-login',
      component: () => import('@/features/account/views/AccountLoginView.vue'),
      meta: { title: 'Masuk' },
    },
    ...ssoAuthRoutes.map((route) =>
      route.name === 'login' ? { ...route, path: '/masuk' } : route,
    ),
    ...authRoutes.filter(
      (route) =>
        route.name === 'forgot-password' || route.name === 'reset-password',
    ),
    {
      path: '/',
      component: () => import('@/layouts/AccountLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'launcher',
          component: () => import('@/features/account/views/LauncherView.vue'),
          meta: { requiresAuth: true, title: 'Aplikasi' },
        },
        ...profileRoutes,
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/layouts/NotFoundPage.vue'),
      meta: { title: 'Halaman Tidak Ditemukan' },
    },
  ],
})

router.beforeEach((to) => {
  const store = useAuthStore()
  if (!store.user) {
    const user = authSessionService.hydrateUser()
    if (user) store.setUser(user)
  }
  if (to.matched.some((record) => record.meta.requiresAuth) && !store.user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
