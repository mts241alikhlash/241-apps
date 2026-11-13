import type { RouteRecordRaw } from 'vue-router'

const crumbs = (title: string, href: string) => [
  { title: 'Ujian', href: '#' },
  { title: 'Ruang Ujian', href: '/exam/rooms' },
  { title, href },
]

export const examRoomRoutes: RouteRecordRaw[] = [
  {
    path: '/exam/rooms',
    name: 'ExamRoomOverview',
    component: () => import('./views/RoomOverviewListView.vue'),
    meta: {
      title: 'Ruang Ujian',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-rooms.supervise',
        'exam-rooms.technician',
        'exam-rooms.manage-all',
      ],
      breadcrumbs: crumbs('Ruang Ujian', '/exam/rooms'),
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
        'exam-rooms.manage-all',
      ],
      breadcrumbs: crumbs('Cetak Berita Acara', '#'),
    },
  },
  {
    path: '/exam/rooms/:roomId/cards',
    name: 'ExamRoomCardsPrint',
    component: () => import('./views/RoomPrintView.vue'),
    props: { kind: 'cards' },
    meta: {
      title: 'Cetak Kartu Peserta',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-rooms.supervise',
        'exam-rooms.technician',
        'exam-rooms.manage-all',
      ],
      breadcrumbs: crumbs('Cetak Kartu Peserta', '#'),
    },
  },
  {
    path: '/exam/rooms/:roomId/seats',
    name: 'ExamRoomLabelsPrint',
    component: () => import('./views/RoomPrintView.vue'),
    props: { kind: 'labels' },
    meta: {
      title: 'Cetak Daftar Meja',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-rooms.supervise',
        'exam-rooms.technician',
        'exam-rooms.manage-all',
      ],
      breadcrumbs: crumbs('Cetak Daftar Meja', '#'),
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
        'exam-rooms.manage-all',
      ],
      breadcrumbs: crumbs('Daftar Meja', '#'),
    },
  },
]
