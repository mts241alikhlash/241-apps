import type { RouteRecordRaw } from 'vue-router'

export const teachingAssignmentRoutes: RouteRecordRaw[] = [
  {
    path: '/learning/teaching-assignment',
    name: 'teaching-assignment',
    component: () => import('./views/TeachingAssignmentView.vue'),
    meta: {
      requiresAuth: true,
      requiredAnyPermission: [
        'teaching-assignments.read',
        'teaching-assignments.read-own',
      ],
      title: 'Penugasan Mengajar',
      breadcrumbs: [
        { title: 'Pembelajaran', href: '#' },
        { title: 'Penugasan Mengajar', href: '/learning/teaching-assignment' },
      ],
    },
  },
]
