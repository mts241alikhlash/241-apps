import type { RouteRecordRaw } from 'vue-router'

export const payrollRunRoutes: RouteRecordRaw[] = [
  {
    path: '/payroll/runs',
    name: 'PayrollRunList',
    component: () => import('./views/PayrollRunListView.vue'),
    meta: {
      title: 'Penggajian',
      requiresAuth: true,
      requiredPermission: 'payroll-runs.read',
      breadcrumbs: [
        { title: 'Penggajian', href: '#' },
        { title: 'Perhitungan', href: '/payroll/runs' },
      ],
    },
  },
  {
    path: '/payroll/runs/:id',
    name: 'PayrollRunDetail',
    component: () => import('./views/PayrollRunDetailView.vue'),
    meta: {
      title: 'Detail Penggajian',
      requiresAuth: true,
      requiredPermission: 'payroll-runs.read',
      breadcrumbs: [
        { title: 'Penggajian', href: '#' },
        { title: 'Perhitungan', href: '/payroll/runs' },
        { title: 'Detail', href: '#' },
      ],
    },
  },
]
