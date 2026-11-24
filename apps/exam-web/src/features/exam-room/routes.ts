import type { RouteRecordRaw } from 'vue-router'

const crumbs = (title: string, href: string) => [
  { title: 'Ujian', href: '#' },
  { title: 'Monitoring', href: '/exam/rooms' },
  { title, href },
]

export const examRoomRoutes: RouteRecordRaw[] = [
  {
    path: '/exam/rooms',
    name: 'ExamRoomOverview',
    component: () => import('./views/RoomOverviewListView.vue'),
    meta: {
      title: 'Monitoring',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-rooms.supervise',
        'exam-rooms.technician',
        'exam-rooms.read-all',
        'exam-rooms.manage-all',
      ],
      breadcrumbs: crumbs('Monitoring', '/exam/rooms'),
    },
  },
  {
    path: '/exam/monitoring',
    name: 'ExamRoomsLive',
    component: () => import('./views/RoomsLiveView.vue'),
    meta: {
      title: 'Monitoring Semua Ruang',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-rooms.technician',
        'exam-rooms.read-all',
        'exam-rooms.manage-all',
      ],
      breadcrumbs: crumbs('Monitoring Semua Ruang', '/exam/monitoring'),
    },
  },
  {
    path: '/exam/reports/:dayId?/:subjectId?',
    name: 'ExamRoomReports',
    component: () => import('./views/RoomReportListView.vue'),
    meta: {
      title: 'Berita Acara',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-rooms.supervise',
        'exam-rooms.technician',
        'exam-rooms.read-all',
        'exam-rooms.manage-all',
      ],
      breadcrumbs: crumbs('Berita Acara', '/exam/reports'),
    },
  },
  {
    path: '/exam/rooms/:roomId',
    name: 'ExamRoomMonitor',
    component: () => import('./views/RoomMonitorDetailView.vue'),
    meta: {
      title: 'Pemantauan Ruangan',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-rooms.supervise',
        'exam-rooms.technician',
        'exam-rooms.read-all',
        'exam-rooms.manage-all',
      ],
      breadcrumbs: crumbs('Pemantauan Ruangan', '#'),
    },
  },
  {
    path: '/exam/rooms/:roomId/reports/:slotId/print',
    name: 'ExamRoomReportPrint',
    component: () => import('./views/RoomReportPrintView.vue'),
    meta: {
      title: 'Cetak Berita Acara',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-rooms.supervise',
        'exam-rooms.technician',
        'exam-rooms.read-all',
        'exam-rooms.manage-all',
      ],
      breadcrumbs: crumbs('Cetak Berita Acara', '#'),
    },
  },
  {
    path: '/exam/prints/cards',
    name: 'ExamCardsPrintAll',
    component: () => import('./views/RosterPrintAllView.vue'),
    props: { kind: 'cards' },
    meta: {
      title: 'Kartu Peserta',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-rooms.supervise',
        'exam-rooms.technician',
        'exam-rooms.read-all',
        'exam-rooms.manage-all',
      ],
      breadcrumbs: crumbs('Kartu Peserta', '#'),
    },
  },
  {
    path: '/exam/prints/seats',
    name: 'ExamSeatLabelsPrintAll',
    component: () => import('./views/RosterPrintAllView.vue'),
    props: { kind: 'labels' },
    meta: {
      title: 'Daftar Meja',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-rooms.supervise',
        'exam-rooms.technician',
        'exam-rooms.read-all',
        'exam-rooms.manage-all',
      ],
      breadcrumbs: crumbs('Daftar Meja', '#'),
    },
  },
]
