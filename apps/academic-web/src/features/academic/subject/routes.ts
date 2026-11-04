import type { RouteRecordRaw } from 'vue-router'

export const subjectRoutes: RouteRecordRaw[] = [
  {
    path: '/learning/subject',
    name: 'subject',
    component: () => import('./views/SubjectView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'subjects.read',
      title: 'Mata Pelajaran',
      breadcrumbs: [
        { title: 'Pembelajaran', href: '#' },
        { title: 'Mata Pelajaran', href: '/learning/subject' },
      ],
    },
  },
  {
    path: '/learning/my-subject',
    name: 'my-subject',
    component: () => import('./views/MySubjectView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'classrooms.read-own',
      title: 'Mata Pelajaran Saya',
      breadcrumbs: [
        { title: 'Akademik Saya', href: '#' },
        { title: 'Mata Pelajaran Saya' },
      ],
    },
  },
]
