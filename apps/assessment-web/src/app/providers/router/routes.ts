import type { RouteRecordRaw } from 'vue-router'
import { ssoAuthRoutes } from '@/features/platform/auth/routes'
import { assessmentItemRoutes } from '@/features/assessment/assessment-item'
import { examScoreRoutes } from '@/features/exam-score'
import { attendanceRoutes } from '@/features/assessment/attendance'
import { myDashboardRoutes } from '@/features/assessment/my-dashboard'
import { raporRoutes } from '@/features/assessment/rapor/routes'
import { studentScoreRoutes } from '@/features/assessment/student-score'
import { profileRoutes } from '@/features/platform/profile'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  ...ssoAuthRoutes,
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      ...myDashboardRoutes,
      ...assessmentItemRoutes,
      ...studentScoreRoutes,
      ...examScoreRoutes,
      ...raporRoutes,
      ...attendanceRoutes,
      ...profileRoutes,
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/layouts/NotFoundPage.vue'),
    meta: { title: 'Halaman Tidak Ditemukan' },
  },
]
