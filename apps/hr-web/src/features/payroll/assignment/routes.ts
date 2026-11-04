import type { RouteRecordRaw } from 'vue-router'

export const salaryAssignmentRoutes: RouteRecordRaw[] = [
  {
    path: '/payroll/employee-salaries',
    name: 'SalaryAssignmentList',
    component: () => import('./views/SalaryAssignmentView.vue'),
    meta: {
      title: 'Gaji Pegawai',
      requiresAuth: true,
      requiredPermission: 'payroll-salaries.read',
      breadcrumbs: [
        { title: 'Penggajian', href: '#' },
        { title: 'Gaji Pegawai', href: '/payroll/employee-salaries' },
      ],
    },
  },
]
