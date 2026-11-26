import type { RouteRecordRaw } from 'vue-router'

export const assessmentWeightRoutes: RouteRecordRaw[] = [
  {
    path: '/assessment/weights',
    name: 'AssessmentWeights',
    component: () => import('./views/AssessmentWeightListView.vue'),
    meta: {
      title: 'Bobot Penilaian',
      requiresAuth: true,
      requiredPermission: 'assessment-items.read',
      breadcrumbs: [
        { title: 'Penilaian', href: '#' },
        { title: 'Bobot Penilaian', href: '/assessment/weights' },
      ],
    },
  },
]
