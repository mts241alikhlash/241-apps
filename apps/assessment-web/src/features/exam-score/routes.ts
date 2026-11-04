import type { RouteRecordRaw } from 'vue-router'

export const examScoreRoutes: RouteRecordRaw[] = [
  {
    path: '/nilai-ujian',
    name: 'ExamScores',
    component: () => import('./views/ScoreListView.vue'),
    meta: {
      title: 'Nilai Ujian',
      requiresAuth: true,
      requiredPermission: 'exam-scores.read',
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Nilai Ujian', href: '/nilai-ujian' },
      ],
    },
  },
]
