import type { RouteRecordRaw } from 'vue-router'

export const assessmentItemRoutes: RouteRecordRaw[] = [
  {
    path: '/student-scores',
    name: 'AssessmentItems',
    component: () => import('./views/AssessmentItemListView.vue'),
    meta: {
      title: 'Tugas',
      requiresAuth: true,
      requiredPermission: 'assessment-items.read',
      breadcrumbs: [
        { title: 'Penilaian', href: '#' },
        { title: 'Tugas', href: '/student-scores' },
      ],
    },
  },
  {
    path: '/assessment/items',
    name: 'AssessmentGrading',
    component: () => import('./views/AssessmentGradingListView.vue'),
    meta: {
      title: 'Penilaian',
      requiresAuth: true,
      requiredPermission: 'student-scores.read',
      breadcrumbs: [
        { title: 'Penilaian', href: '#' },
        { title: 'Penilaian', href: '/assessment/items' },
      ],
    },
  },
]
