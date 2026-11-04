import type { RouteRecordRaw } from 'vue-router'

export const workPatternRoutes: RouteRecordRaw[] = [
  {
    path: '/attendance/shifts',
    name: 'WorkPatternList',
    component: () => import('./views/WorkPatternListView.vue'),
    meta: {
      title: 'Pola Kerja',
      requiresAuth: true,
      requiredPermission: 'work-patterns.read',
      breadcrumbs: [
        { title: 'Presensi', href: '#' },
        { title: 'Pola Kerja', href: '/attendance/shifts' },
      ],
    },
  },
  {
    path: '/attendance/shift-assignments',
    name: 'WorkPatternAssignmentList',
    component: () => import('./views/WorkPatternAssignmentView.vue'),
    meta: {
      title: 'Penugasan Pola Kerja',
      requiresAuth: true,
      requiredPermission: 'work-patterns.read',
      breadcrumbs: [
        { title: 'Presensi', href: '#' },
        {
          title: 'Penugasan Pola Kerja',
          href: '/attendance/shift-assignments',
        },
      ],
    },
  },
  {
    path: '/attendance/holidays',
    name: 'NonWorkingDayList',
    component: () => import('./views/NonWorkingDayListView.vue'),
    meta: {
      title: 'Hari Libur',
      requiresAuth: true,
      requiredPermission: 'non-working-days.read',
      breadcrumbs: [
        { title: 'Presensi', href: '#' },
        { title: 'Hari Libur', href: '/attendance/holidays' },
      ],
    },
  },
  {
    path: '/attendance/periods',
    name: 'AttendancePeriodList',
    component: () => import('./views/AttendancePeriodView.vue'),
    meta: {
      title: 'Periode Kehadiran',
      requiresAuth: true,
      requiredPermission: 'presence-records.read',
      breadcrumbs: [
        { title: 'Presensi', href: '#' },
        { title: 'Periode', href: '/attendance/periods' },
      ],
    },
  },
]
