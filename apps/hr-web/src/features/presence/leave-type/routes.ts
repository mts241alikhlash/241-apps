import type { RouteRecordRaw } from 'vue-router'

export const leaveTypeRoutes: RouteRecordRaw[] = [
  {
    path: '/attendance/leave-types',
    name: 'LeaveTypeList',
    component: () => import('./views/LeaveTypeView.vue'),
    meta: {
      title: 'Jenis Izin & Cuti',
      requiresAuth: true,
      requiredPermission: 'leave-types.read',
      breadcrumbs: [
        { title: 'Presensi', href: '#' },
        { title: 'Jenis Izin & Cuti', href: '/attendance/leave-types' },
      ],
    },
  },
]
