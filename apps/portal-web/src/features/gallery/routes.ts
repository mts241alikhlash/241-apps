import type { RouteRecordRaw } from 'vue-router'

export const portalGalleryRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/gallery',
    name: 'admin-gallery',
    component: () => import('./views/AlbumListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-albums.read',
      title: 'Galeri',
      breadcrumbs: [{ title: 'Konten' }, { title: 'Galeri' }],
    },
  },
  {
    path: '/admin/gallery/new',
    name: 'admin-album-new',
    component: () => import('./views/AlbumFormView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-albums.create',
      title: 'Album Baru',
      breadcrumbs: [{ title: 'Konten' }, { title: 'Album Baru' }],
    },
  },
  {
    path: '/admin/gallery/:id',
    name: 'admin-album-edit',
    component: () => import('./views/AlbumFormView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-albums.update',
      title: 'Ubah Album',
      breadcrumbs: [{ title: 'Konten' }, { title: 'Ubah Album' }],
    },
  },
]

export const portalPublicGalleryRoutes: RouteRecordRaw[] = [
  {
    path: 'gallery',
    name: 'public-gallery',
    component: () => import('./views/PublicAlbumListView.vue'),
    meta: { title: 'Galeri' },
  },
  {
    path: 'gallery/:slug',
    name: 'public-gallery-detail',
    component: () => import('./views/PublicAlbumDetailView.vue'),
    meta: { title: 'Galeri' },
  },
]
