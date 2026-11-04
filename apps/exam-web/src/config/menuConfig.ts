import {
  CalendarClock,
  ClipboardPen,
  ListChecks,
  Package,
  Radar,
  SquareCheckBig,
  Users,
} from '@lucide/vue'

export type {
  SubMenuItem,
  MenuItem,
  MenuSection,
} from '@mts241alikhlash/web-shared/types/menu.types'
import type { MenuSection } from '@mts241alikhlash/web-shared/types/menu.types'

export const menuSections: MenuSection[] = [
  {
    key: 'exam',
    label: 'menu.section.exam',
    items: [
      {
        key: 'exam-packages',
        title: 'menu.examPackages',
        url: '/exam/packages',
        icon: Package,
        requiredPermission: 'exam-packages.read',
      },
      {
        key: 'exam-package-review',
        title: 'menu.examPackageReview',
        url: '/exam/package-approvals',
        icon: SquareCheckBig,
        requiredPermission: 'exam-questions.approve',
      },
      {
        key: 'exam-events',
        title: 'menu.examEvents',
        url: '/exam/events',
        icon: Users,
        requiredPermission: 'exam-events.read',
      },
      {
        key: 'exam-schedules',
        title: 'menu.examSchedules',
        url: '/exam/schedules',
        icon: CalendarClock,
        requiredPermission: 'exam-schedules.read',
      },
      {
        key: 'exam-rooms',
        title: 'menu.examRooms',
        url: '/exam/rooms',
        icon: Radar,
        requiredAnyPermission: [
          'exam-rooms.supervise',
          'exam-rooms.technician',
          'exam-rooms.manage-all',
        ],
      },
      {
        key: 'exam-grading',
        title: 'menu.examGrading',
        url: '/exam/grading',
        icon: ClipboardPen,
        requiredPermission: 'exam-grading.read',
      },
    ],
  },
  {
    key: 'mine',
    label: 'menu.section.mine',
    items: [
      {
        key: 'my-exams',
        title: 'menu.myExams',
        url: '/my-exams',
        icon: ListChecks,
        requiredPermission: 'exam-sessions.take',
      },
    ],
  },
]
