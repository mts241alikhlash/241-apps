import type { RouteRecordRaw } from 'vue-router'

export const leaveRoutes: RouteRecordRaw[] = [
  {
    path: '/attendance/my-leave',
    name: 'MyLeave',
    component: () => import('./views/MyLeaveView.vue'),
    meta: {
      title: 'Izin & Cuti Saya',
      requiresAuth: true,
      requiredPermission: 'leave-requests.read-own',
      breadcrumbs: [
        { title: 'Presensi', href: '#' },
        { title: 'Izin & Cuti Saya', href: '/attendance/my-leave' },
      ],
    },
  },
  {
    path: '/attendance/leave-approvals',
    name: 'LeaveApproval',
    component: () => import('./views/LeaveApprovalView.vue'),
    meta: {
      title: 'Persetujuan Izin',
      requiresAuth: true,
      requiredPermission: 'leave-requests.approve',
      breadcrumbs: [
        { title: 'Presensi', href: '#' },
        { title: 'Persetujuan Izin', href: '/attendance/leave-approvals' },
      ],
    },
  },
]
