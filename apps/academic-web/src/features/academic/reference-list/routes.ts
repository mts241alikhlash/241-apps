import type { RouteRecordRaw } from 'vue-router'
import { REFERENCE_LISTS } from './lists'

export const referenceListRoutes: RouteRecordRaw[] = REFERENCE_LISTS.map(
  (list) => ({
    path: `/setting/${list.path}`,
    name: `ReferenceList:${list.path}`,
    component: () => import('./views/ReferenceListView.vue'),
    meta: {
      title: list.singular,
      requiresAuth: true,
      requiredPermission: `${list.path}.read`,
      referenceList: list.path,
      breadcrumbs: [
        { title: 'Pengaturan', href: '#' },
        { title: list.singular, href: `/setting/${list.path}` },
      ],
    },
  }),
)
