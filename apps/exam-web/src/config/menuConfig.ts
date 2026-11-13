import {
  CalendarClock,
  ClipboardPen,
  Layers,
  ListChecks,
  Package,
  Radar,
  ShieldCheck,
  SlidersHorizontal,
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
    key: 'bank',
    label: 'menu.section.bank',
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
    ],
  },
  {
    key: 'exam',
    label: 'menu.section.exam',
    items: [
      {
        key: 'exam-events',
        title: 'menu.examEvents',
        url: '/exam/events',
        icon: Users,
        requiredPermission: 'exam-events.read',
      },
      {
        key: 'exam-activities',
        title: 'menu.examActivities',
        url: '/exam/activities',
        icon: Layers,
        requiredPermission: 'exam-schedules.manage',
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
    key: 'classwork',
    label: 'menu.section.classwork',
    items: [
      {
        key: 'classwork-activities',
        title: 'menu.classworkActivities',
        url: '/classwork/activities',
        icon: Layers,
        requiredPermission: 'exam-schedules.manage',
      },
      {
        key: 'classwork-schedules',
        title: 'menu.classworkSchedules',
        url: '/classwork/schedules',
        icon: CalendarClock,
        requiredPermission: 'exam-schedules.read',
      },
      {
        key: 'classwork-grading',
        title: 'menu.classworkGrading',
        url: '/classwork/grading',
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
  {
    key: 'settings',
    label: 'menu.section.settings',
    items: [
      {
        key: 'exam-presets',
        title: 'menu.examPresets',
        url: '/settings/presets',
        icon: SlidersHorizontal,
        requiredPermission: 'exam-schedules.manage-all',
      },
      {
        key: 'exam-seb',
        title: 'menu.examSeb',
        url: '/settings/seb',
        icon: ShieldCheck,
        requiredPermission: 'exam-schedules.manage-all',
      },
    ],
  },
]
