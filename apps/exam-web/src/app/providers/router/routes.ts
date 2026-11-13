import type { RouteRecordRaw } from 'vue-router'
import { ssoAuthRoutes } from '@mts241alikhlash/platform/auth'
import { examActivityRoutes } from '@/features/exam-activity'
import { examPackageRoutes } from '@/features/exam-package'
import { examEventRoutes } from '@/features/exam-event'
import { examGradingRoutes } from '@/features/exam-grading'
import { examPresetRoutes } from '@/features/exam-preset'
import { examSebRoutes } from '@/features/exam-seb'
import { examRoomRoutes } from '@/features/exam-room'
import { examScheduleRoutes } from '@/features/exam-schedule'
import {
  studentExamFocusRoutes,
  studentExamRoutes,
} from '@/features/student-exam/routes'
import { profileRoutes } from '@mts241alikhlash/platform/profile'

export function landingPath(permissions: readonly string[]): string {
  if (permissions.includes('exam-rooms.supervise')) return '/exam/rooms'
  if (permissions.includes('exam-rooms.technician')) return '/exam/rooms'
  if (permissions.includes('exam-schedules.read')) return '/exam/schedules'
  if (permissions.includes('exam-packages.read')) return '/exam/packages'
  if (permissions.includes('exam-grading.read')) return '/exam/grading'
  if (permissions.includes('exam-sessions.take')) return '/my-exams'
  return '/profile'
}

export const appLayout = () => import('@/layouts/AppLayout.vue')

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: appLayout,
    children: [
      ...examActivityRoutes,
      ...examEventRoutes,
      ...examPackageRoutes,
      ...examScheduleRoutes,
      ...examRoomRoutes,
      ...examGradingRoutes,
      ...examPresetRoutes,
      ...examSebRoutes,
      ...studentExamRoutes,
      ...profileRoutes,
    ],
  },
  ...ssoAuthRoutes,
  ...studentExamFocusRoutes,
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/layouts/NotFoundPage.vue'),
    meta: { title: 'Halaman Tidak Ditemukan' },
  },
]
