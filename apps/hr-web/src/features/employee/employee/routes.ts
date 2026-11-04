import type { RouteRecordRaw } from 'vue-router'

export const employeeRoutes: RouteRecordRaw[] = [
  {
    path: '/staff',
    name: 'employee',
    component: () => import('./views/EmployeeListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'employees.read',
      title: 'Daftar Pegawai',
      breadcrumbs: [
        { title: 'Kepegawaian', href: '#' },
        { title: 'Daftar Pegawai' },
      ],
    },
  },
  {
    path: '/staff/create',
    name: 'employee-create',
    component: () => import('./views/EmployeeCreateView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'employees.read',
      title: 'Tambah Pegawai',
      breadcrumbs: [
        { title: 'Pegawai', href: '/staff' },
        { title: 'Tambah Pegawai' },
      ],
    },
  },
  {
    path: '/staff/accounts',
    name: 'employee-accounts',
    component: () => import('./views/EmployeeAccountView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'users.read',
      title: 'Akun Pegawai',
      breadcrumbs: [
        { title: 'Pegawai', href: '/staff' },
        { title: 'Akun Pegawai' },
      ],
    },
  },
]
