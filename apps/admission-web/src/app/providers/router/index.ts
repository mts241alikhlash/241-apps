import '@mts241alikhlash/web-shared/types/router'
import { authRoutes } from '@/features/platform/auth'
import { profileRoutes } from '@/features/platform/profile'
import { admissionPublicRoutes, admissionRoutes } from '@/features/admission'
import { createRouter, createWebHistory } from 'vue-router'
import { authSessionService, useAuthStore } from '@/features/platform/auth'
import {
  deniedRedirect,
  effectivePermissions,
  resolveHomeRoute,
} from './home-route'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...admissionPublicRoutes,
    ...authRoutes.filter((route) => route.name !== 'login'),
    {
      path: '/login',
      name: 'login',
      component: () =>
        import('@/features/admission/views/AdmissionLoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [...admissionRoutes, ...profileRoutes],
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      redirect: () => {
        const user = authSessionService.hydrateUser()
        return resolveHomeRoute(user?.permissions ?? [])
      },
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
    if (user) {
      store.setUser(user)
    }
  }

  const hasSession = Boolean(store.user)

  if (to.meta.requiresAuth && !hasSession) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && hasSession) {
    return resolveHomeRoute(store.user?.permissions ?? [])
  }

  const requiredPermission = to.meta.requiredPermission
  if (requiredPermission) {
    const user = store.user
    if (!user) return { name: 'login' }
    const permissions = effectivePermissions(user.permissions ?? [])
    if (!permissions.includes(requiredPermission)) {
      return deniedRedirect(to.path, permissions)
    }
  }

  return true
})

router.afterEach((to) => {
  const title = to.meta.title
  if (typeof title === 'string') document.title = title
})

export default router
