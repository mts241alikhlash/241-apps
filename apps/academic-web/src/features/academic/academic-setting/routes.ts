import type { RouteRecordRaw } from 'vue-router'

export const academicSettingRoutes: RouteRecordRaw[] = [
  {
    path: '/setting/weekly-holiday',
    name: 'weekly-holiday',
    component: () => import('./views/WeeklyHolidayView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'academic-settings.read',
      title: 'Hari Libur Mingguan',
      breadcrumbs: [
        { title: 'Data Akademik', href: '#' },
        { title: 'Hari Libur Mingguan', href: '/setting/weekly-holiday' },
      ],
    },
  },
  {
    path: '/setting/passing-score',
    name: 'passing-score',
    component: () => import('./views/PassingScoreView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'academic-settings.read',
      title: 'Nilai Ketuntasan Minimum (KKM)',
      breadcrumbs: [
        { title: 'Data Akademik', href: '#' },
        {
          title: 'Nilai Ketuntasan Minimum (KKM)',
          href: '/setting/passing-score',
        },
      ],
    },
  },
]
