import type { RouteRecordRaw } from 'vue-router'

export const portalTaxonomyRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/categories',
    name: 'admin-categories',
    component: () => import('./views/CategoryListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-categories.read',
      title: 'Kategori',
      breadcrumbs: [{ title: 'Konten' }, { title: 'Kategori' }],
    },
  },
  {
    path: '/admin/tags',
    name: 'admin-tags',
    component: () => import('./views/TagListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-tags.read',
      title: 'Tag',
      breadcrumbs: [{ title: 'Konten' }, { title: 'Tag' }],
    },
  },
]
