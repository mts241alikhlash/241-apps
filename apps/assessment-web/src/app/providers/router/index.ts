import '@mts241alikhlash/web-shared/types/router'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { authSessionService, useAuthStore } from '@/features/platform/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
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
    return { name: 'dashboard' }
  }

  const requiredPermission = to.meta.requiredPermission
  const requiredAnyPermission = to.meta.requiredAnyPermission
  if (requiredPermission || requiredAnyPermission?.length) {
    const user = store.user
    if (!user) return { name: 'login' }
    const userPermissions = user.permissions ?? []

    const allowed = requiredPermission
      ? userPermissions.includes(requiredPermission)
      : (requiredAnyPermission ?? []).some((code) =>
          userPermissions.includes(code),
        )

    if (!allowed) return { name: 'dashboard' }
  }

  return true
})

router.afterEach((to) => {
  const title = to.meta.title
  if (typeof title === 'string') document.title = title
})

export default router
