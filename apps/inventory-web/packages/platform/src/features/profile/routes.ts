import type { RouteRecordRaw } from 'vue-router'

export const profileRoutes: RouteRecordRaw[] = [
  {
    path: '/profile',
    name: 'profile-view',
    component: () => import('./views/ProfileView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Profil',
      breadcrumbs: [{ title: 'Profil', href: '#' }, { title: 'Detail Profil' }],
    },
  },
  {
    path: '/profile/edit',
    name: 'profile-edit',
    component: () => import('./views/ProfileFormView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Ubah Data Diri',
      breadcrumbs: [
        { title: 'Profil', href: '/profile' },
        { title: 'Ubah Data Diri' },
      ],
    },
  },
  {
    path: '/profile/:role/:id',
    name: 'profile-other-view',
    component: () => import('./views/ProfileView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Profil Pengguna',
      requiredPermission: 'profiles.read',
      breadcrumbs: [{ title: 'Profil', href: '#' }, { title: 'Detail Profil' }],
    },
  },
  {
    path: '/profile/:role/:id/edit',
    name: 'profile-other-edit',
    component: () => import('./views/ProfileFormView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Ubah Data Diri',
      requiredPermission: 'profiles.update',
      breadcrumbs: [
        { title: 'Profil', href: '/profile' },
        { title: 'Ubah Data Diri' },
      ],
    },
  },
]
