import type { RouteRecordRaw } from 'vue-router'
import { PRINT_DOCUMENTS } from './documents'
import { PRINT_DOCUMENT_KEYS } from './types'

const crumbs = (title: string, href: string) => [
  { title: 'Ujian', href: '#' },
  { title: 'Cetak Dokumen', href: '#' },
  { title, href },
]

const documentRoutes: RouteRecordRaw[] = PRINT_DOCUMENT_KEYS.map((doc) => {
  const { title } = PRINT_DOCUMENTS[doc]
  const path = `/exam/print/${doc}`
  return {
    path,
    name: `ExamPrint-${doc}`,
    component: () => import('./views/PrintDocumentView.vue'),
    props: { doc },
    meta: {
      title,
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.manage'],
      breadcrumbs: crumbs(title, path),
    },
  }
})

export const examPrintRoutes: RouteRecordRaw[] = [
  {
    path: '/exam/print/student-attendance/:dayId?/:subjectId?',
    name: 'ExamPrintStudentAttendance',
    component: () => import('./views/StudentAttendanceView.vue'),
    meta: {
      title: 'Daftar Hadir Peserta',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.manage'],
      breadcrumbs: crumbs(
        'Daftar Hadir Peserta',
        '/exam/print/student-attendance',
      ),
    },
  },
  {
    path: '/exam/print/staff-attendance',
    name: 'ExamPrintStaffAttendance',
    component: () => import('./views/StaffAttendanceView.vue'),
    meta: {
      title: 'Daftar Hadir Pengawas dan Teknisi',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.manage'],
      breadcrumbs: crumbs(
        'Daftar Hadir Pengawas dan Teknisi',
        '/exam/print/staff-attendance',
      ),
    },
  },
  ...documentRoutes,
]
