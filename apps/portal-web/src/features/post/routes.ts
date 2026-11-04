import type { RouteRecordRaw } from 'vue-router'

export const portalPublicPostRoutes: RouteRecordRaw[] = [
  {
    path: 'news',
    name: 'public-news',
    component: () => import('./views/PublicPostListView.vue'),
    meta: { postType: 'BERITA', title: 'Berita' },
  },
  {
    path: 'news/:slug',
    name: 'public-news-detail',
    component: () => import('./views/PublicPostDetailView.vue'),
    meta: { postType: 'BERITA', title: 'Berita' },
  },
  {
    path: 'articles',
    name: 'public-articles',
    component: () => import('./views/PublicPostListView.vue'),
    meta: { postType: 'ARTIKEL', title: 'Artikel' },
  },
  {
    path: 'articles/:slug',
    name: 'public-article-detail',
    component: () => import('./views/PublicPostDetailView.vue'),
    meta: { postType: 'ARTIKEL', title: 'Artikel' },
  },
  {
    path: 'announcements',
    name: 'public-announcements',
    component: () => import('./views/PublicAnnouncementListView.vue'),
    meta: { postType: 'PENGUMUMAN', title: 'Pengumuman' },
  },
  {
    path: 'announcements/:slug',
    name: 'public-announcement-detail',
    component: () => import('./views/PublicPostDetailView.vue'),
    meta: { postType: 'PENGUMUMAN', title: 'Pengumuman' },
  },
]

export const portalPostRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/news',
    name: 'admin-news',
    component: () => import('./views/PostListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-posts.read',
      postType: 'BERITA',
      title: 'Berita',
      breadcrumbs: [{ title: 'Konten' }, { title: 'Berita' }],
    },
  },
  {
    path: '/admin/articles',
    name: 'admin-articles',
    component: () => import('./views/PostListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-posts.read',
      postType: 'ARTIKEL',
      title: 'Artikel',
      breadcrumbs: [{ title: 'Konten' }, { title: 'Artikel' }],
    },
  },
  {
    path: '/admin/announcements',
    name: 'admin-announcements',
    component: () => import('./views/PostListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-posts.read',
      postType: 'PENGUMUMAN',
      title: 'Pengumuman',
      breadcrumbs: [{ title: 'Konten' }, { title: 'Pengumuman' }],
    },
  },
  {
    path: '/admin/content/new/:type',
    name: 'admin-post-new',
    component: () => import('./views/PostFormView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-posts.create',
      title: 'Tulis Konten',
      breadcrumbs: [{ title: 'Konten' }, { title: 'Tulis' }],
    },
  },
  {
    path: '/admin/content/:id',
    name: 'admin-post-edit',
    component: () => import('./views/PostFormView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-posts.update',
      title: 'Ubah Konten',
      breadcrumbs: [{ title: 'Konten' }, { title: 'Ubah' }],
    },
  },
  {
    path: '/admin/home',
    name: 'admin-homepage-settings',
    component: () =>
      import('@/features/homepage/views/HomepageSectionSettingsView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'portal-settings.read',
      title: 'Pengaturan Beranda',
      breadcrumbs: [{ title: 'Pengaturan Portal' }, { title: 'Beranda' }],
    },
  },
]
