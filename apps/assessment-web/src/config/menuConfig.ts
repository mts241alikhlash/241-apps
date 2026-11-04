import {
  CalendarCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ListChecks,
  Medal,
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
        key: 'assessment-items',
        title: 'menu.assessmentItems',
        url: '/assessment/items',
        icon: ListChecks,
        requiredPermission: 'assessment-items.read',
      },
      {
        key: 'student-scores',
        title: 'menu.studentScores',
        url: '/student-scores',
        icon: ClipboardList,
        requiredPermission: 'student-scores.read',
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
    key: 'exam',
    label: 'menu.section.exam',
    items: [
      {
        key: 'exam-scores',
        title: 'menu.examScores',
        url: '/nilai-ujian',
        icon: Medal,
        requiredPermission: 'exam-scores.read',
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
