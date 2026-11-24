import type { RouteRecordRaw } from 'vue-router'
import type { ExamCategory } from '@/features/exam-shared/examType'

function buildActivityRoutes(
  prefix: '/exam' | '/classwork',
  namePrefix: 'Exam' | 'Classwork',
  sectionTitle: 'Ujian' | 'Non-ujian',
  category: ExamCategory,
): RouteRecordRaw[] {
  const readPermissions =
    category === 'EXAM'
      ? ['exam-schedules.manage-all', 'exam-events.read']
      : [
          'exam-schedules.manage',
          'exam-schedules.read',
          'exam-schedules.manage-all',
          'exam-events.read',
        ]
  const createPermissions =
    category === 'EXAM'
      ? ['exam-schedules.manage-all', 'exam-events.manage']
      : ['exam-schedules.manage', 'exam-schedules.manage-all']

  return [
    {
      path: `${prefix}/activities`,
      name: `${namePrefix}Activities`,
      component: () => import('./views/ActivityListView.vue'),
      meta: {
        title: `Kegiatan ${sectionTitle}`,
        category,
        requiresAuth: true,
        requiredAnyPermission: readPermissions,
        breadcrumbs: [
          { title: sectionTitle, href: '#' },
          { title: 'Kegiatan', href: `${prefix}/activities` },
        ],
      },
    },
    {
      path: `${prefix}/activities/new`,
      name: `${namePrefix}ActivityCreate`,
      component: () => import('./views/ActivityCreateView.vue'),
      meta: {
        title: `Buat Kegiatan ${sectionTitle}`,
        category,
        requiresAuth: true,
        requiredAnyPermission: createPermissions,
        breadcrumbs: [
          { title: sectionTitle, href: '#' },
          { title: 'Kegiatan', href: `${prefix}/activities` },
          { title: 'Buat', href: `${prefix}/activities/new` },
        ],
      },
    },
    {
      path: `${prefix}/activities/:id`,
      name: `${namePrefix}ActivityDetail`,
      component: () => import('./views/ActivityDetailView.vue'),
      meta: {
        title: `Detail Kegiatan ${sectionTitle}`,
        category,
        requiresAuth: true,
        requiredAnyPermission: readPermissions,
        breadcrumbs: [
          { title: sectionTitle, href: '#' },
          { title: 'Kegiatan', href: `${prefix}/activities` },
          { title: 'Detail', href: '#' },
        ],
      },
    },
  ]
}

export const examActivityRoutes: RouteRecordRaw[] = [
  ...buildActivityRoutes('/exam', 'Exam', 'Ujian', 'EXAM'),
  ...buildActivityRoutes('/classwork', 'Classwork', 'Non-ujian', 'NON_EXAM'),
]
