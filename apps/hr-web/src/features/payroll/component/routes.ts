import type { RouteRecordRaw } from 'vue-router'

export const salaryComponentRoutes: RouteRecordRaw[] = [
  {
    path: '/payroll/components',
    name: 'SalaryComponentList',
    component: () => import('./views/SalaryComponentView.vue'),
    meta: {
      title: 'Komponen Gaji',
      requiresAuth: true,
      requiredPermission: 'payroll-components.read',
      breadcrumbs: [
        { title: 'Penggajian', href: '#' },
        { title: 'Komponen Gaji', href: '/payroll/components' },
      ],
    },
  },
]
