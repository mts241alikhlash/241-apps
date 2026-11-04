import type { RouteRecordRaw } from 'vue-router'

const meta = (title: string, crumbs: { title: string; href: string }[]) => ({
  title,
  requiresAuth: true,
  requiredPermission: 'exam-grading.read',
  breadcrumbs: [{ title: 'Ujian', href: '#' }, ...crumbs],
})

export const examGradingRoutes: RouteRecordRaw[] = [
  {
    path: '/exam/grading',
    name: 'ExamGrading',
    component: () => import('./views/GradingScheduleListView.vue'),
    meta: meta('Penilaian Ujian', [
      { title: 'Penilaian Ujian', href: '/exam/grading' },
    ]),
  },
  {
    path: '/exam/grading/:scheduleId',
    name: 'ExamGradingSessions',
    component: () => import('./views/GradingSessionListView.vue'),
    meta: meta('Daftar Siswa', [
      { title: 'Penilaian Ujian', href: '/exam/grading' },
      { title: 'Daftar Siswa', href: '#' },
    ]),
  },
  {
    path: '/exam/grading/:scheduleId/:sessionId',
    name: 'ExamGradingDetail',
    component: () => import('./views/GradingDetailView.vue'),
    meta: meta('Nilai Jawaban', [
      { title: 'Penilaian Ujian', href: '/exam/grading' },
      { title: 'Nilai Jawaban', href: '#' },
    ]),
  },
]
