import type { RouteRecordRaw } from 'vue-router'

export const examSebRoutes: RouteRecordRaw[] = [
  {
    path: '/settings/seb',
    name: 'ExamSeb',
    component: () => import('./views/SebSettingsView.vue'),
    meta: {
      title: 'Safe Exam Browser',
      requiresAuth: true,
      requiredPermission: 'exam-schedules.manage-all',
      breadcrumbs: [
        { title: 'Pengaturan', href: '#' },
        { title: 'Safe Exam Browser', href: '/settings/seb' },
      ],
    },
  },
]
