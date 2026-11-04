import '@mts241alikhlash/web-shared/types/router'
import { ssoAuthRoutes } from '@/features/platform/auth'
import { dashboardRoutes } from '@/features/platform/dashboard'
import { credentialRoutes } from '@/features/presence/credential'
import { presenceDeviceRoutes } from '@/features/presence/device'
import { employeeAttendanceRoutes } from '@/features/presence/employee-attendance'
import { workPatternRoutes } from '@/features/presence/work-pattern'
import { leaveRoutes } from '@/features/presence/leave'
import { leaveTypeRoutes } from '@/features/presence/leave-type'
import { kioskRoutes } from '@/features/presence/kiosk'
import { salaryComponentRoutes } from '@/features/payroll/component'
import { salaryAssignmentRoutes } from '@/features/payroll/assignment'
import { payrollRunRoutes } from '@/features/payroll/run'
import { payslipRoutes } from '@/features/payroll/payslip'
import { employeeRoutes } from '@/features/employee/employee/routes'
import { positionRoutes } from '@/features/employee/position/routes'
import { positionCategoryRoutes } from '@/features/employee/position-category/routes'
import { employmentTypeRoutes } from '@/features/employee/employment-type/routes'
import { createRouter, createWebHistory } from 'vue-router'
import { authSessionService, useAuthStore } from '@/features/platform/auth'
import { profileRoutes } from '@/features/platform/profile'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    ...ssoAuthRoutes,
    ...kioskRoutes,
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        ...employeeRoutes,
        ...positionRoutes,
        ...positionCategoryRoutes,
        ...employmentTypeRoutes,
        ...dashboardRoutes,
        ...credentialRoutes,
        ...presenceDeviceRoutes,
        ...employeeAttendanceRoutes,
        ...workPatternRoutes,
        ...leaveRoutes,
        ...leaveTypeRoutes,
        ...salaryComponentRoutes,
        ...salaryAssignmentRoutes,
        ...payrollRunRoutes,
        ...payslipRoutes,
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
    return { name: 'dashboard' }
  }

  const requiredPermission = to.meta.requiredPermission
  if (requiredPermission) {
    const user = store.user
    if (!user) return { name: 'login' }
    const userPermissions = user.permissions ?? []
    if (!userPermissions.includes(requiredPermission)) {
      return { name: 'dashboard' }
    }
  }

  return true
})

router.afterEach((to) => {
  const title = to.meta.title
  if (typeof title === 'string') document.title = title
})

export default router
