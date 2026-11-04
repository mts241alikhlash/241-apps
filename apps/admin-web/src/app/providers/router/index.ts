import '@mts241alikhlash/web-shared/types/router'
import { createRouter, createWebHistory } from 'vue-router'
import { ssoAuthRoutes } from '@/features/platform/auth'
import { dashboardRoutes } from '@/features/dashboard'
import { authSessionService, useAuthStore } from '@/features/platform/auth'
import { auditLogsRoutes } from '@/features/platform/audit-log'
import { bloodTypeRoutes } from '@/features/platform/blood-type'
import { fileRoutes } from '@/features/platform/file'
import { permissionsRoutes } from '@/features/platform/permission'
import { religionRoutes } from '@/features/platform/religion'
import { rolesRoutes } from '@/features/platform/role'
import { schoolUnitRoutes } from '@/features/platform/school-unit'
import { schoolUnitTypeRoutes } from '@/features/platform/school-unit-type'
import { userRoleRoutes } from '@/features/platform/user-role'
import { profileRoutes } from '@/features/platform/profile'

const HOME = '/dashboard'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: HOME,
    },
    ...ssoAuthRoutes,
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        ...dashboardRoutes,
        ...userRoleRoutes,
        ...rolesRoutes,
        ...permissionsRoutes,
        ...auditLogsRoutes,
        ...fileRoutes,
        ...schoolUnitRoutes,
        ...schoolUnitTypeRoutes,
        ...religionRoutes,
        ...bloodTypeRoutes,
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
    if (user) {
      store.setUser(user)
    }
  }

  const hasSession = Boolean(store.user)

  if (to.meta.requiresAuth && !hasSession) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && hasSession) {
    return HOME
  }

  const requiredPermission = to.meta.requiredPermission
  if (requiredPermission) {
    const user = store.user
    if (!user) return { name: 'login' }
    const userPermissions = user.permissions ?? []
    if (!userPermissions.includes(requiredPermission)) {
      return HOME
    }
  }

  return true
})

export default router
