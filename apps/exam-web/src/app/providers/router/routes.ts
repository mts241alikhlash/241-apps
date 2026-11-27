import type { RouteRecordRaw } from 'vue-router'
import { ssoAuthRoutes } from '@mts241alikhlash/platform/auth'
import { examActivityRoutes } from '@/features/exam-activity'
import { examPrintRoutes } from '@/features/exam-print'
import { examPackageRoutes } from '@/features/exam-package'
import { examEventRoutes } from '@/features/exam-event'
import { examGradingRoutes } from '@/features/exam-grading'
import { examOfflineRoutes } from '@/features/exam-offline'
import { examParticipantRoutes } from '@/features/exam-participant'
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
  if (permissions.includes('exam-schedules.read')) {
    return permissions.includes('exam-schedules.manage-all') ||
      permissions.includes('exam-events.read')
      ? '/exam/schedules'
      : '/classwork/schedules'
  }
  if (permissions.includes('exam-events.read')) return '/exam/events'
  if (permissions.includes('exam-packages.read')) return '/exam/packages'
  if (
    permissions.includes('exam-grading.read') ||
    permissions.includes('exam-grading.read-all')
  ) {
    return '/exam/grading'
  }
  if (permissions.includes('exam-rooms.read-all')) return '/exam/rooms'
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
      ...examPrintRoutes,
      ...examGradingRoutes,
      ...examOfflineRoutes,
      ...examParticipantRoutes,
      ...examPresetRoutes,
      ...examSebRoutes,
      ...profileRoutes,
    ],
  },
  ...ssoAuthRoutes,
  ...studentExamRoutes,
  ...studentExamFocusRoutes,
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/layouts/NotFoundPage.vue'),
    meta: { title: 'Halaman Tidak Ditemukan' },
  },
]
