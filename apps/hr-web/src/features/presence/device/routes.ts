import type { RouteRecordRaw } from 'vue-router'

export const presenceDeviceRoutes: RouteRecordRaw[] = [
  {
    path: '/attendance/devices',
    name: 'PresenceDeviceList',
    component: () => import('./views/DeviceListView.vue'),
    meta: {
      title: 'Perangkat Gerbang',
      requiresAuth: true,
      requiredPermission: 'presence-devices.read',
      breadcrumbs: [
        { title: 'Presensi', href: '#' },
        { title: 'Perangkat Gerbang', href: '/attendance/devices' },
      ],
    },
  },
]
