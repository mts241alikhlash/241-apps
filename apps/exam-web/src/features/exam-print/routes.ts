import type { RouteRecordRaw } from 'vue-router'
import { PRINT_DOCUMENTS } from './documents'
import { PRINT_DOCUMENT_KEYS } from './types'

const crumbs = (title: string, href: string) => [
  { title: 'Ujian', href: '#' },
  { title: 'Cetak Dokumen', href: '#' },
  { title, href },
]

const documentRoutes: RouteRecordRaw[] = PRINT_DOCUMENT_KEYS.filter(
  (doc) => doc !== 'schedule',
).map((doc) => {
  const { title } = PRINT_DOCUMENTS[doc]
  const basePath = `/exam/print/${doc}`
  return {
    path: `${basePath}/:eventId?/:roomId?`,
    name: `ExamPrint-${doc}`,
    component: () => import('./views/PrintDocumentView.vue'),
    props: { doc },
    meta: {
      title,
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.manage', 'exam-events.read'],
      breadcrumbs: crumbs(title, basePath),
    },
  }
})

export const examPrintRoutes: RouteRecordRaw[] = [
  {
    path: '/exam/print/student-attendance/:eventId?/:dayId?/:subjectId?',
    name: 'ExamPrintStudentAttendance',
    component: () => import('./views/StudentAttendanceView.vue'),
    meta: {
      title: 'Daftar Hadir Peserta',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.manage', 'exam-events.read'],
      breadcrumbs: crumbs(
        'Daftar Hadir Peserta',
        '/exam/print/student-attendance',
      ),
    },
  },
  {
    path: '/exam/print/grading-sheet/:eventId?/:dayId?/:subjectId?/:classId?',
    name: 'ExamPrintGradingSheet',
    component: () => import('./views/GradingSheetView.vue'),
    meta: {
      title: 'Lembar Pemeriksaan Uraian',
      category: 'EXAM',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-grading.read',
        'exam-grading.read-all',
        'exam-grading.manage-all',
      ],
      breadcrumbs: crumbs(
        'Lembar Pemeriksaan Uraian',
        '/exam/print/grading-sheet',
      ),
    },
  },
  {
    path: '/exam/print/score-sheet',
    name: 'ExamPrintScoreSheet',
    component: () => import('./views/ScoreSheetView.vue'),
    meta: {
      title: 'Score Sheet',
      category: 'EXAM',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-grading.read',
        'exam-grading.read-all',
        'exam-grading.manage-all',
      ],
      breadcrumbs: crumbs('Score Sheet', '/exam/print/score-sheet'),
    },
  },
  {
    path: '/classwork/print/grading-sheet/:dayId?/:subjectId?/:classId?',
    name: 'ClassworkPrintGradingSheet',
    component: () => import('./views/GradingSheetView.vue'),
    meta: {
      title: 'Lembar Pemeriksaan Uraian',
      category: 'NON_EXAM',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-grading.read',
        'exam-grading.read-all',
        'exam-grading.manage-all',
      ],
      breadcrumbs: [
        { title: 'Non-ujian', href: '#' },
        {
          title: 'Lembar Pemeriksaan Uraian',
          href: '/classwork/print/grading-sheet',
        },
      ],
    },
  },
  {
    path: '/exam/print/staff-attendance/:eventId?',
    name: 'ExamPrintStaffAttendance',
    component: () => import('./views/StaffAttendanceView.vue'),
    meta: {
      title: 'Daftar Hadir Pengawas dan Teknisi',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.manage', 'exam-events.read'],
      breadcrumbs: crumbs(
        'Daftar Hadir Pengawas dan Teknisi',
        '/exam/print/staff-attendance',
      ),
    },
  },
  {
    path: '/exam/print/schedule/:eventId?',
    name: 'ExamPrint-schedule',
    component: () => import('./views/ExamScheduleView.vue'),
    meta: {
      title: 'Jadwal Ujian',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.manage', 'exam-events.read'],
      breadcrumbs: crumbs('Jadwal Ujian', '/exam/print/schedule'),
    },
  },
  {
    path: '/exam/print/question-keys/:eventId?/:subjectId?',
    name: 'ExamPrintQuestionKeys',
    component: () => import('./views/QuestionKeySheetView.vue'),
    meta: {
      title: 'Daftar Soal dan Kunci',
      requiresAuth: true,
      requiredAnyPermission: ['exam-events.manage', 'exam-events.read'],
      breadcrumbs: crumbs('Daftar Soal dan Kunci', '/exam/print/question-keys'),
    },
  },
  {
    path: '/exam/print/student-recap/:eventId?/:subjectId?/:classId?',
    name: 'ExamPrintStudentRecap',
    component: () => import('./views/StudentRecapView.vue'),
    meta: {
      title: 'Rekap Soal Siswa',
      requiresAuth: true,
      requiredAnyPermission: [
        'exam-grading.read',
        'exam-grading.read-all',
        'exam-grading.manage-all',
      ],
      breadcrumbs: crumbs('Rekap Soal Siswa', '/exam/print/student-recap'),
    },
  },
  ...documentRoutes,
]
