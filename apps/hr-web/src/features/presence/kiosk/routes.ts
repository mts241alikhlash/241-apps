import type { RouteRecordRaw } from 'vue-router'

export const kioskRoutes: RouteRecordRaw[] = [
  {
    path: '/attendance/kiosk',
    name: 'PresenceKiosk',
    component: () => import('./views/KioskView.vue'),
    meta: {
      title: 'Kiosk Presensi',
      requiresAuth: false,
      layout: 'blank',
    },
  },
]
