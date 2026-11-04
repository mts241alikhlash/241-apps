import type { RouteRecordRaw } from 'vue-router'

export const gradeRoutes: RouteRecordRaw[] = [
  {
    path: '/academic/grade',
    name: 'grade',
    component: () => import('./views/GradeView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'classrooms.update',
      title: 'Tingkat Kelas',
      breadcrumbs: [
        { title: 'Akademik', href: '#' },
        { title: 'Tingkat Kelas', href: '/academic/grade' },
      ],
    },
  },
]
