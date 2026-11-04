import type { RouteRecordRaw } from 'vue-router'

export const portalPageRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/pages',
    name: 'admin-pages',
    component: () => import('./views/PageListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-pages.read',
      title: 'Halaman',
      breadcrumbs: [{ title: 'Konten' }, { title: 'Halaman' }],
    },
  },
  {
    path: '/admin/pages/new',
    name: 'admin-page-new',
    component: () => import('./views/PageFormView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-pages.create',
      title: 'Halaman Baru',
      breadcrumbs: [{ title: 'Konten' }, { title: 'Halaman Baru' }],
    },
  },
  {
    path: '/admin/pages/:id',
    name: 'admin-page-edit',
    component: () => import('./views/PageFormView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-pages.update',
      title: 'Ubah Halaman',
      breadcrumbs: [{ title: 'Konten' }, { title: 'Ubah Halaman' }],
    },
  },
  {
    path: '/admin/menu',
    name: 'admin-menu',
    component: () => import('./views/NavigationSettingsView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-pages.read',
      title: 'Menu Portal',
      breadcrumbs: [{ title: 'Pengaturan Portal' }, { title: 'Menu' }],
    },
  },
]

export const portalPublicPageRoutes: RouteRecordRaw[] = [
  {
    path: ':pageSlug',
    name: 'public-page',
    component: () => import('./views/PublicPageView.vue'),
    meta: { title: 'Portal MTs Persis 241 Al-Ikhlash' },
  },
]
