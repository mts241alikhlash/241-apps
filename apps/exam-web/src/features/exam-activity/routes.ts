import type { RouteRecordRaw } from 'vue-router'

export const examActivityRoutes: RouteRecordRaw[] = [
  {
    path: '/exam/activities/new',
    name: 'ExamActivityCreate',
    component: () => import('./views/ActivityCreateView.vue'),
    meta: {
      title: 'Kegiatan Ujian',
      requiresAuth: true,
      requiredPermission: 'exam-schedules.manage',
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Kegiatan', href: '/exam/activities/new' },
      ],
    },
  },
]
