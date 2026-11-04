import type { RouteRecordRaw } from 'vue-router'

export const employmentTypeRoutes: RouteRecordRaw[] = [
  {
    path: '/contract-types',
    name: 'EmploymentTypeList',
    component: () => import('./views/EmploymentTypeListView.vue'),
    meta: {
      title: 'Status Kepegawaian',
      requiresAuth: true,
      requiredPermission: 'employees.read',
      breadcrumbs: [
        { title: 'Pengaturan', href: '#' },
        { title: 'Status Kepegawaian', href: '/contract-types' },
      ],
    },
  },
]
