import type { RouteRecordRaw } from 'vue-router'
import { isInSeb } from '@/shared/seb'

const sebGated = (load: () => Promise<unknown>) => () =>
  isInSeb() ? load() : import('./views/SebRequiredView.vue')

export const studentExamRoutes: RouteRecordRaw[] = [
  {
    path: '/my-exams',
    name: 'student-exam-list',
    component: sebGated(() => import('./views/ExamListView.vue')),
    meta: {
      requiresAuth: true,
      title: 'Daftar Ujian',
      requiredPermission: 'exam-sessions.take',
      breadcrumbs: [{ title: 'Daftar Ujian' }],
    },
  },
  {
    path: '/my-exams/:scheduleId/token',
    name: 'student-exam-token',
    component: sebGated(() => import('./views/ExamTokenView.vue')),
    meta: {
      requiresAuth: true,
      title: 'Token Ujian',
      requiredPermission: 'exam-sessions.take',
      breadcrumbs: [
        { title: 'Daftar Ujian', href: '/my-exams' },
        { title: 'Token Ujian' },
      ],
    },
  },
]

export const studentExamFocusRoutes: RouteRecordRaw[] = [
  {
    path: '/my-exams/sessions/:sessionId',
    name: 'student-exam-sheet',
    component: sebGated(() => import('./views/ExamSheetView.vue')),
    meta: {
      requiresAuth: true,
      title: 'Lembar Ujian',
      requiredPermission: 'exam-sessions.take',
    },
  },
]
