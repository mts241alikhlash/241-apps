import type { RouteRecordRaw } from 'vue-router'

export const portalHomeRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: 'portal-home',
    component: () => import('./views/HomeView.vue'),
    meta: { title: 'Portal MTs Persis 241 Al-Ikhlash' },
  },
]
