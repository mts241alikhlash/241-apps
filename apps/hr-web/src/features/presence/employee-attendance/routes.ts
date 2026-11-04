import type { RouteRecordRaw } from 'vue-router'

export const employeeAttendanceRoutes: RouteRecordRaw[] = [
  {
    path: '/attendance/employee-attendance',
    name: 'EmployeeAttendanceList',
    component: () => import('./views/EmployeeAttendanceView.vue'),
    meta: {
      title: 'Kehadiran Pegawai',
      requiresAuth: true,
      requiredPermission: 'presence-records.read',
      breadcrumbs: [
        { title: 'Presensi', href: '#' },
        { title: 'Kehadiran Pegawai', href: '/attendance/employee-attendance' },
      ],
    },
  },
  {
    path: '/attendance/summary',
    name: 'PresenceMonthlyRecap',
    component: () => import('./views/MonthlyRecapView.vue'),
    meta: {
      title: 'Rekap Bulanan',
      requiresAuth: true,
      requiredPermission: 'presence-records.read',
      breadcrumbs: [
        { title: 'Presensi', href: '#' },
        { title: 'Rekap Bulanan', href: '/attendance/summary' },
      ],
    },
  },
  {
    path: '/attendance/my-attendance',
    name: 'MyAttendance',
    component: () => import('./views/MyAttendanceView.vue'),
    meta: {
      title: 'Kehadiran Saya',
      requiresAuth: true,
      requiredPermission: 'presence-records.read-own',
      breadcrumbs: [
        { title: 'Presensi', href: '#' },
        { title: 'Kehadiran Saya', href: '/attendance/my-attendance' },
      ],
    },
  },
]
