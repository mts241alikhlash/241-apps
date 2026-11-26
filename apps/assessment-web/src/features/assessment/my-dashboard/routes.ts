import type { RouteRecordRaw } from 'vue-router'

export const myDashboardRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('./views/MyDashboardView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Dasbor',
      breadcrumbs: [{ title: 'Dasbor' }],
    },
  },
]
