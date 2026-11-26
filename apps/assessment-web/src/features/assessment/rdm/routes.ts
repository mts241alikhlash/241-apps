import type { RouteRecordRaw } from 'vue-router'

export const rdmRoutes: RouteRecordRaw[] = [
  {
    path: '/settings/rdm',
    name: 'rdm-settings',
    component: () => import('./views/RdmSettingView.vue'),
    meta: {
      title: 'Pengaturan RDM',
      requiresAuth: true,
      requiredPermission: 'assessment-settings.read',
      breadcrumbs: [
        { title: 'Penilaian', href: '#' },
        { title: 'Pengaturan RDM', href: '/settings/rdm' },
      ],
    },
  },
]
