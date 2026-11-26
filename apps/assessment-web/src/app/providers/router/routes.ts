import type { RouteRecordRaw } from 'vue-router'
import { ssoAuthRoutes } from '@mts241alikhlash/platform/auth'
import { assessmentItemRoutes } from '@/features/assessment/assessment-item'
import { assessmentWeightRoutes } from '@/features/assessment/assessment-weight'
import { examScoreRoutes } from '@/features/exam-score'
import { attendanceRoutes } from '@/features/assessment/attendance'
import { myDashboardRoutes } from '@/features/assessment/my-dashboard'
import { raporRoutes } from '@/features/assessment/rapor/routes'
import { rdmRoutes } from '@/features/assessment/rdm'
import { studentScoreRoutes } from '@/features/assessment/student-score'
import { profileRoutes } from '@mts241alikhlash/platform/profile'

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
      ...assessmentWeightRoutes,
      ...studentScoreRoutes,
      ...examScoreRoutes,
      ...raporRoutes,
      ...rdmRoutes,
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
