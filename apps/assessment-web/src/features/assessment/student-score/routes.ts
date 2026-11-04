import type { RouteRecordRaw } from 'vue-router'

export const studentScoreRoutes: RouteRecordRaw[] = [
  {
    path: '/my/scores',
    name: 'my-scores',
    component: () => import('./views/MyScoreView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'student-scores.read-own',
      title: 'Nilai Saya',
      breadcrumbs: [{ title: 'Akademik Saya', href: '#' }, { title: 'Nilai' }],
    },
  },
  {
    path: '/student-scores/:assessmentItemId/grade',
    name: 'student-score-grading',
    component: () => import('./views/StudentScoreGradingView.vue'),
    meta: {
      title: 'Nilai Siswa',
      requiresAuth: true,
      requiredPermission: 'student-scores.read',
      breadcrumbs: [
        { title: 'Penilaian', href: '#' },
        { title: 'Nilai Siswa', href: '/student-scores' },
        { title: 'Input Nilai' },
      ],
    },
  },
]
