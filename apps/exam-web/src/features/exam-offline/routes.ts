import type { RouteRecordRaw } from 'vue-router'
import { OFFLINE_SCORES_PATH } from './types'

const meta = (title: string, crumbs: { title: string; href: string }[]) => ({
  title,
  category: 'EXAM',
  requiresAuth: true,
  requiredAnyPermission: [
    'exam-grading.read',
    'exam-grading.read-all',
    'exam-grading.manage-all',
  ],
  breadcrumbs: [
    { title: 'Ujian', href: '#' },
    { title: 'Nilai Offline', href: OFFLINE_SCORES_PATH },
    ...crumbs,
  ],
})

export const examOfflineRoutes: RouteRecordRaw[] = [
  {
    path: OFFLINE_SCORES_PATH,
    name: 'ExamOfflineScores',
    component: () => import('./views/OfflineScoreListView.vue'),
    meta: meta('Nilai Offline', []),
  },
  {
    path: `${OFFLINE_SCORES_PATH}/:scheduleId`,
    name: 'ExamOfflineScoreEntry',
    component: () => import('./views/OfflineScoreEntryView.vue'),
    meta: meta('Isi Nilai', [{ title: 'Isi Nilai', href: '#' }]),
  },
]
