import type { RouteRecordRaw } from 'vue-router'

export const attendanceRoutes: RouteRecordRaw[] = [
  {
    path: '/my/attendance',
    name: 'my-attendance',
    component: () => import('./views/MyAttendanceView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'attendances.read-own',
      title: 'Kehadiran Saya',
      breadcrumbs: [
        { title: 'Akademik Saya', href: '#' },
        { title: 'Kehadiran' },
      ],
    },
  },
  {
    path: '/attendance',
    name: 'attendance',
    redirect: { name: 'attendance-input' },
  },
  {
    path: '/attendance/input',
    name: 'attendance-input',
    component: () => import('./views/AttendanceInputView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'attendances.manage',
      title: 'Input Kehadiran',
      breadcrumbs: [
        { title: 'Kehadiran', href: '#' },
        { title: 'Input Kehadiran', href: '/attendance/input' },
      ],
    },
  },
  {
    path: '/attendance/recap',
    name: 'attendance-recap',
    component: () => import('./views/AttendanceRecapView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'attendances.read',
      title: 'Rekapitulasi Kehadiran',
      breadcrumbs: [
        { title: 'Kehadiran', href: '#' },
        { title: 'Rekapitulasi', href: '/attendance/recap' },
      ],
    },
  },
]
