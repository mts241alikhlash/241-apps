import {
  CalendarCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ListChecks,
  Medal,
  Scale,
} from '@lucide/vue'

export type {
  SubMenuItem,
  MenuItem,
  MenuSection,
} from '@mts241alikhlash/web-shared/types/menu.types'
import type { MenuSection } from '@mts241alikhlash/web-shared/types/menu.types'

export const menuSections: MenuSection[] = [
  {
    key: 'overview',
    label: 'menu.section.overview',
    items: [
      {
        key: 'dashboard',
        title: 'menu.dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    key: 'assessment',
    label: 'menu.section.assessment',
    items: [
      {
        key: 'assessment-classwork',
        title: 'menu.assessmentClasswork',
        url: '#',
        icon: ListChecks,
        items: [
          {
            title: 'menu.assessmentTasks',
            url: '/assessment/tasks',
            requiredPermission: 'assessment-items.read',
          },
          {
            title: 'menu.assessmentItems',
            url: '/assessment/items',
            requiredPermission: 'student-scores.read',
          },
        ],
      },
      {
        key: 'assessment-exam',
        title: 'menu.assessmentExam',
        url: '#',
        icon: Medal,
        items: [
          {
            title: 'menu.examAssessmentTasks',
            url: '/assessment/exam-tasks',
            requiredPermission: 'assessment-items.read',
          },
          {
            title: 'menu.examAssessmentItems',
            url: '/assessment/exam-items',
            requiredPermission: 'student-scores.read',
          },
          {
            title: 'menu.examScores',
            url: '/nilai-ujian',
            requiredPermission: 'exam-scores.read',
          },
        ],
      },
      {
        key: 'assessment-weights',
        title: 'menu.assessmentWeights',
        url: '/assessment/weights',
        icon: Scale,
        requiredPermission: 'assessment-items.read',
      },
      {
        key: 'report-card',
        title: 'menu.reportCard',
        url: '/report-card',
        icon: FileText,
        requiredPermission: 'report-cards.read',
      },
    ],
  },
  {
    key: 'attendance',
    label: 'menu.section.attendance',
    items: [
      {
        key: 'attendance',
        title: 'menu.attendance',
        url: '#',
        icon: CalendarCheck,
        items: [
          {
            title: 'menu.attendanceInput',
            url: '/attendance/input',
            requiredPermission: 'attendances.manage',
          },
          {
            title: 'menu.attendanceRecap',
            url: '/attendance/recap',
            requiredPermission: 'attendances.read',
          },
        ],
      },
    ],
  },
  {
    key: 'mine',
    label: 'menu.section.mine',
    items: [
      {
        key: 'my-scores',
        title: 'menu.myScores',
        url: '/my/scores',
        icon: ClipboardList,
        requiredPermission: 'student-scores.read-own',
      },
      {
        key: 'my-report-card',
        title: 'menu.myReportCard',
        url: '/my/report-card',
        icon: FileText,
        requiredPermission: 'report-cards.read-own',
      },
      {
        key: 'my-attendance',
        title: 'menu.myAttendance',
        url: '/my/attendance',
        icon: CalendarCheck,
        requiredPermission: 'attendances.read-own',
      },
    ],
  },
]
