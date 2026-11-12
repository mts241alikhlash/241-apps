import type { RouteRecordRaw } from 'vue-router'

export const examEventRoutes: RouteRecordRaw[] = [
  {
    path: '/exam/events',
    name: 'ExamEvents',
    component: () => import('./views/EventListView.vue'),
    meta: {
      title: 'Periode Ujian',
      category: 'EXAM',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.read', 'exam-rooms.supervise'],
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Periode Ujian', href: '/exam/events' },
      ],
    },
  },
  {
    path: '/exam/events/:id',
    name: 'ExamEventDetail',
    component: () => import('./views/EventDetailView.vue'),
    meta: {
      title: 'Periode Ujian',
      category: 'EXAM',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.read', 'exam-rooms.supervise'],
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Periode Ujian', href: '/exam/events' },
      ],
    },
  },
]
