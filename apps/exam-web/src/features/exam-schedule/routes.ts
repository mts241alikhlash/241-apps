import type { RouteRecordRaw } from 'vue-router'

export const examScheduleRoutes: RouteRecordRaw[] = [
  {
    path: '/exam/schedules',
    name: 'ExamSchedules',
    component: () => import('./views/ScheduleListView.vue'),
    meta: {
      title: 'Jadwal Ujian',
      requiresAuth: true,
      requiredPermission: 'exam-schedules.read',
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Jadwal Ujian', href: '/exam/schedules' },
      ],
    },
  },
  {
    path: '/exam/schedules/:scheduleId/sessions',
    name: 'ExamScheduleSessions',
    component: () => import('./views/ScheduleSessionListView.vue'),
    meta: {
      title: 'Sesi Ujian',
      requiresAuth: true,
      requiredPermission: 'exam-sessions.read',
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Jadwal Ujian', href: '/exam/schedules' },
        { title: 'Sesi Ujian', href: '#' },
      ],
    },
  },
]
