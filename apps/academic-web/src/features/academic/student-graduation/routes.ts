import type { RouteRecordRaw } from 'vue-router'

export const studentGraduationRoutes: RouteRecordRaw[] = [
  {
    path: '/academic/graduation',
    name: 'graduation',
    component: () => import('./views/GraduationView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'graduations.read',
      title: 'Kelulusan',
      breadcrumbs: [
        { title: 'Periode Akademik', href: '#' },
        { title: 'Kelulusan', href: '/academic/graduation' },
      ],
    },
  },
  {
    path: '/student/alumni',
    name: 'student-graduation',
    component: () => import('./views/StudentGraduationView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'graduations.read',
      title: 'Alumni',
      breadcrumbs: [
        { title: 'Siswa', href: '#' },
        { title: 'Alumni', href: '/student/alumni' },
      ],
    },
  },
]
