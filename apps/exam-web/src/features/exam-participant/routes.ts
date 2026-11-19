import type { RouteRecordRaw } from 'vue-router'

export const examParticipantRoutes: RouteRecordRaw[] = [
  {
    path: '/exam/participant-numbers',
    name: 'ExamParticipantNumbers',
    component: () => import('./views/ParticipantNumberView.vue'),
    meta: {
      title: 'Nomor Peserta',
      category: 'EXAM',
      requiresAuth: true,
      requiredPermission: 'exam-events.manage',
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Nomor Peserta', href: '/exam/participant-numbers' },
      ],
    },
  },
]
