import type { RouteRecordRaw } from 'vue-router'
import type { ExamCategory } from '@/features/exam-shared/examType'

function buildScheduleRoutes(
  prefix: '/exam' | '/classwork',
  namePrefix: 'Exam' | 'Classwork',
  sectionTitle: 'Ujian' | 'Non-ujian',
  category: ExamCategory,
): RouteRecordRaw[] {
  return [
    {
      path: `${prefix}/schedules`,
      name: `${namePrefix}Schedules`,
      component: () => import('./views/ScheduleListView.vue'),
      meta: {
        title: `Jadwal ${sectionTitle}`,
        category,
        requiresAuth: true,
        requiredPermission: 'exam-schedules.read',
        breadcrumbs: [
          { title: sectionTitle, href: '#' },
          { title: `Jadwal ${sectionTitle}`, href: `${prefix}/schedules` },
        ],
      },
    },
    {
      path: `${prefix}/schedules/:scheduleId/sessions`,
      name: `${namePrefix}ScheduleSessions`,
      component: () => import('./views/ScheduleSessionListView.vue'),
      meta: {
        title: `Sesi ${sectionTitle}`,
        category,
        requiresAuth: true,
        requiredPermission: 'exam-sessions.read',
        breadcrumbs: [
          { title: sectionTitle, href: '#' },
          { title: `Jadwal ${sectionTitle}`, href: `${prefix}/schedules` },
          { title: `Sesi ${sectionTitle}`, href: '#' },
        ],
      },
    },
  ]
}

export const examScheduleRoutes: RouteRecordRaw[] = [
  ...buildScheduleRoutes('/exam', 'Exam', 'Ujian', 'EXAM'),
  ...buildScheduleRoutes('/classwork', 'Classwork', 'Non-ujian', 'NON_EXAM'),
]
