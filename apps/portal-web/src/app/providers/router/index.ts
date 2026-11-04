import '@mts241alikhlash/web-shared/types/router'
import { ssoAuthRoutes } from '@/features/platform/auth'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/features/platform/auth'
import { authSessionService } from '@/features/platform/auth'
import { portalAgendaRoutes, portalPublicAgendaRoutes } from '@/features/agenda'
import {
  portalGalleryRoutes,
  portalPublicGalleryRoutes,
} from '@/features/gallery'
import { portalHomeRoutes } from '@/features/homepage'
import { portalPageRoutes, portalPublicPageRoutes } from '@/features/page'
import { portalPostRoutes, portalPublicPostRoutes } from '@/features/post'
import { portalTaxonomyRoutes } from '@/features/taxonomy'
import { profileRoutes } from '@/features/platform/profile'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/PublicLayout.vue'),
      children: [
        ...portalHomeRoutes,
        ...portalPublicPostRoutes,
        ...portalPublicAgendaRoutes,
        ...portalPublicGalleryRoutes,
        ...portalPublicPageRoutes,
      ],
    },
    ...ssoAuthRoutes,
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        ...portalPostRoutes,
        ...portalTaxonomyRoutes,
        ...portalPageRoutes,
        ...portalAgendaRoutes,
        ...portalGalleryRoutes,
        ...profileRoutes,
      ],
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      redirect: () => ({ name: 'admin-news' }),
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
    return { name: 'portal-home' }
  }

  const requiredPermission = to.meta.requiredPermission
  if (requiredPermission) {
    const user = store.user
    if (!user) return { name: 'login' }
    const userPermissions = user.permissions ?? []
    if (!userPermissions.includes(requiredPermission)) {
      return { name: 'portal-home' }
    }
  }

  return true
})

router.afterEach((to) => {
  const title = to.meta.title
  if (typeof title === 'string') document.title = title
})

export default router
