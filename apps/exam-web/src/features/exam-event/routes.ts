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
        { title: 'Persiapan', href: '#' },
        { title: 'Periode Ujian', href: '/exam/events' },
      ],
    },
  },
  {
    path: '/exam/events/:id',
    name: 'ExamEventDetail',
    redirect: (to) => ({
      path: `/exam/room-setup/${String(to.params.id)}`,
    }),
    meta: {
      title: 'Ruangan',
      category: 'EXAM',
      requiresAuth: true,
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Persiapan', href: '#' },
        { title: 'Ruangan', href: '/exam/room-setup' },
      ],
    },
  },
  {
    path: '/exam/room-setup',
    name: 'ExamRoomSetup',
    component: () => import('./views/EventRoomSummaryView.vue'),
    props: { title: 'Ruangan', detailBase: '/exam/room-setup' },
    meta: {
      title: 'Ruangan',
      category: 'EXAM',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.read', 'exam-rooms.supervise'],
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Persiapan', href: '#' },
        { title: 'Ruangan', href: '/exam/room-setup' },
      ],
    },
  },
  {
    path: '/exam/room-setup/:id',
    name: 'ExamRoomSetupDetail',
    component: () => import('./views/RoomSetupView.vue'),
    meta: {
      title: 'Ruangan',
      category: 'EXAM',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.read', 'exam-rooms.supervise'],
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Persiapan', href: '#' },
        { title: 'Ruangan', href: '/exam/room-setup' },
      ],
    },
  },
  {
    path: '/exam/seat-assignment',
    name: 'ExamSeatAssignment',
    component: () => import('./views/EventRoomSummaryView.vue'),
    props: { title: 'Pembagian Kursi', detailBase: '/exam/seat-assignment' },
    meta: {
      title: 'Pembagian Kursi',
      category: 'EXAM',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.read', 'exam-rooms.supervise'],
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Persiapan', href: '#' },
        { title: 'Pembagian Kursi', href: '/exam/seat-assignment' },
      ],
    },
  },
  {
    path: '/exam/seat-assignment/:id',
    name: 'ExamSeatAssignmentDetail',
    component: () => import('./views/SeatAssignmentView.vue'),
    meta: {
      title: 'Pembagian Kursi',
      category: 'EXAM',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.read', 'exam-rooms.supervise'],
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Persiapan', href: '#' },
        { title: 'Pembagian Kursi', href: '/exam/seat-assignment' },
      ],
    },
  },
  {
    path: '/exam/supervisor-schedule',
    name: 'ExamSupervisorSchedule',
    component: () => import('./views/EventRoomSummaryView.vue'),
    props: {
      title: 'Jadwal Pengawas',
      detailBase: '/exam/supervisor-schedule',
    },
    meta: {
      title: 'Jadwal Pengawas',
      category: 'EXAM',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.read', 'exam-rooms.supervise'],
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Persiapan', href: '#' },
        { title: 'Jadwal Pengawas', href: '/exam/supervisor-schedule' },
      ],
    },
  },
  {
    path: '/exam/supervisor-schedule/:id/:dayId?/:subjectId?',
    name: 'ExamSupervisorScheduleDetail',
    component: () => import('./views/SupervisorScheduleView.vue'),
    meta: {
      title: 'Jadwal Pengawas',
      category: 'EXAM',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.read', 'exam-rooms.supervise'],
      breadcrumbs: [
        { title: 'Ujian', href: '#' },
        { title: 'Persiapan', href: '#' },
        { title: 'Jadwal Pengawas', href: '/exam/supervisor-schedule' },
      ],
    },
  },
]
