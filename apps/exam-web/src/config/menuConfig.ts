import {
  CalendarClock,
  ClipboardPen,
  Layers,
  ListChecks,
  Package,
  Printer,
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
        key: 'exam-prepare',
        title: 'menu.examPrepare',
        url: '#',
        icon: Users,
        items: [
          {
            title: 'menu.examEvents',
            url: '/exam/events',
            requiredAnyPermission: ['exam-events.read', 'exam-events.manage'],
          },
          {
            title: 'menu.examRoomSetup',
            url: '/exam/room-setup',
            requiredAnyPermission: ['exam-events.read', 'exam-events.manage'],
          },
          {
            title: 'menu.examParticipantNumbers',
            url: '/exam/participant-numbers',
            requiredPermission: 'exam-events.manage',
          },
          {
            title: 'menu.examSeatAssignment',
            url: '/exam/seat-assignment',
            requiredAnyPermission: ['exam-events.read', 'exam-events.manage'],
          },
          {
            title: 'menu.examActivities',
            url: '/exam/activities',
            requiredAnyPermission: [
              'exam-schedules.manage-all',
              'exam-events.read',
            ],
          },
          {
            title: 'menu.examSchedules',
            url: '/exam/schedules',
            requiredAnyPermission: [
              'exam-schedules.manage-all',
              'exam-events.read',
            ],
          },
          {
            title: 'menu.examSupervisorSchedule',
            url: '/exam/supervisor-schedule',
            requiredAnyPermission: ['exam-events.read', 'exam-events.manage'],
          },
        ],
      },
      {
        key: 'exam-run',
        title: 'menu.examRun',
        url: '#',
        icon: CalendarClock,
        items: [
          {
            title: 'menu.examRooms',
            url: '/exam/rooms',
            requiredAnyPermission: [
              'exam-rooms.supervise',
              'exam-rooms.technician',
              'exam-rooms.read-all',
              'exam-rooms.manage-all',
            ],
          },
          {
            title: 'menu.examRoomsLive',
            url: '/exam/monitoring',
            requiredAnyPermission: [
              'exam-rooms.technician',
              'exam-rooms.read-all',
              'exam-rooms.manage-all',
            ],
          },
          {
            title: 'menu.examReports',
            url: '/exam/reports',
            requiredAnyPermission: [
              'exam-rooms.supervise',
              'exam-rooms.technician',
              'exam-rooms.read-all',
              'exam-rooms.manage-all',
            ],
          },
        ],
      },
      {
        key: 'exam-grading',
        title: 'menu.examGrading',
        url: '/exam/grading',
        icon: ClipboardPen,
        requiredAnyPermission: [
          'exam-grading.read',
          'exam-grading.read-all',
          'exam-grading.manage-all',
        ],
      },
      {
        key: 'exam-print',
        title: 'menu.examPrint',
        url: '#',
        icon: Printer,
        items: [
          {
            title: 'menu.examPrintSchedule',
            url: '/exam/print/schedule',
            requiredAnyPermission: ['exam-events.manage', 'exam-events.read'],
          },
          {
            title: 'menu.examCards',
            url: '/exam/print/cards',
            requiredAnyPermission: ['exam-events.manage', 'exam-events.read'],
          },
          {
            title: 'menu.examSeatLabels',
            url: '/exam/print/desks',
            requiredAnyPermission: ['exam-events.manage', 'exam-events.read'],
          },
          {
            title: 'menu.examPrintStudentAttendance',
            url: '/exam/print/student-attendance',
            requiredAnyPermission: ['exam-events.manage', 'exam-events.read'],
          },
          {
            title: 'menu.examPrintStaffAttendance',
            url: '/exam/print/staff-attendance',
            requiredAnyPermission: ['exam-events.manage', 'exam-events.read'],
          },
          {
            title: 'menu.examPrintGradingSheet',
            url: '/exam/print/grading-sheet',
            requiredAnyPermission: [
              'exam-grading.read',
              'exam-grading.read-all',
              'exam-grading.manage-all',
            ],
          },
          {
            title: 'menu.examPrintQuestionKeys',
            url: '/exam/print/question-keys',
            requiredAnyPermission: ['exam-events.manage', 'exam-events.read'],
          },
          {
            title: 'menu.examPrintStudentRecap',
            url: '/exam/print/student-recap',
            requiredAnyPermission: [
              'exam-grading.read',
              'exam-grading.read-all',
              'exam-grading.manage-all',
            ],
          },
        ],
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
        requiredAnyPermission: [
          'exam-schedules.manage',
          'exam-schedules.manage-all',
          'exam-events.read',
        ],
      },
      {
        key: 'classwork-schedules',
        title: 'menu.classworkSchedules',
        url: '/classwork/schedules',
        icon: CalendarClock,
        requiredAnyPermission: [
          'exam-schedules.manage',
          'exam-schedules.manage-all',
          'exam-events.read',
        ],
      },
      {
        key: 'classwork-grading',
        title: 'menu.classworkGrading',
        url: '/classwork/grading',
        icon: ClipboardPen,
        requiredAnyPermission: [
          'exam-grading.read',
          'exam-grading.read-all',
          'exam-grading.manage-all',
        ],
      },
      {
        key: 'classwork-grading-sheet',
        title: 'menu.classworkGradingSheet',
        url: '/classwork/print/grading-sheet',
        icon: Printer,
        requiredAnyPermission: [
          'exam-grading.read',
          'exam-grading.read-all',
          'exam-grading.manage-all',
        ],
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
        requiredPermission: 'exam-settings.manage',
      },
      {
        key: 'exam-seb',
        title: 'menu.examSeb',
        url: '/settings/seb',
        icon: ShieldCheck,
        requiredPermission: 'exam-settings.manage',
      },
    ],
  },
]
