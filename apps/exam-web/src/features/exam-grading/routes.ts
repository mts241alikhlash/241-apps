import type { RouteRecordRaw } from 'vue-router'
import type { ExamCategory } from '@/features/exam-shared/examType'

function buildGradingRoutes(
  prefix: '/exam' | '/classwork',
  namePrefix: 'Exam' | 'Classwork',
  sectionTitle: 'Ujian' | 'Non-ujian',
  category: ExamCategory,
): RouteRecordRaw[] {
  const meta = (title: string, crumbs: { title: string; href: string }[]) => ({
    title,
    category,
    requiresAuth: true,
    requiredPermission: 'exam-grading.read',
    breadcrumbs: [{ title: sectionTitle, href: '#' }, ...crumbs],
  })

  return [
    {
      path: `${prefix}/grading`,
      name: `${namePrefix}Grading`,
      component: () => import('./views/GradingScheduleListView.vue'),
      meta: meta(`Penilaian ${sectionTitle}`, [
        { title: `Penilaian ${sectionTitle}`, href: `${prefix}/grading` },
      ]),
    },
    {
      path: `${prefix}/grading/:scheduleId`,
      name: `${namePrefix}GradingSessions`,
      component: () => import('./views/GradingSessionListView.vue'),
      meta: meta('Daftar Siswa', [
        { title: `Penilaian ${sectionTitle}`, href: `${prefix}/grading` },
        { title: 'Daftar Siswa', href: '#' },
      ]),
    },
    {
      path: `${prefix}/grading/:scheduleId/:sessionId`,
      name: `${namePrefix}GradingDetail`,
      component: () => import('./views/GradingDetailView.vue'),
      meta: meta('Nilai Jawaban', [
        { title: `Penilaian ${sectionTitle}`, href: `${prefix}/grading` },
        { title: 'Nilai Jawaban', href: '#' },
      ]),
    },
  ]
}

export const examGradingRoutes: RouteRecordRaw[] = [
  ...buildGradingRoutes('/exam', 'Exam', 'Ujian', 'EXAM'),
  ...buildGradingRoutes('/classwork', 'Classwork', 'Non-ujian', 'NON_EXAM'),
]
