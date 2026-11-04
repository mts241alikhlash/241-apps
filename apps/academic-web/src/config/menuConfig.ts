import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  ListChecks,
  Users,
} from '@lucide/vue'

export type {
  SubMenuItem,
  MenuItem,
  MenuSection,
} from '@mts241alikhlash/web-shared/types/menu.types'
import type { MenuSection } from '@mts241alikhlash/web-shared/types/menu.types'
import { REFERENCE_LISTS } from '@/features/academic/reference-list/lists'

export const menuSections: MenuSection[] = [
  {
    key: 'academic',
    label: 'menu.section.academic',
    items: [
      {
        key: 'academic-calendar-semester',
        title: 'menu.academicPeriod',
        url: '#',
        icon: CalendarDays,
        items: [
          {
            title: 'menu.academicYear',
            url: '/academic/academic-year',
            requiredPermission: 'academic-years.update',
          },
          {
            title: 'menu.semester',
            url: '/academic/semester',
            requiredPermission: 'semesters.update',
          },
          {
            title: 'menu.semesterRollover',
            url: '/academic/semester/promotion',
            requiredPermission: 'semesters.create',
          },
        ],
      },
      {
        key: 'academic-calendars',
        title: 'menu.academicCalendar',
        url: '#',
        icon: CalendarRange,
        items: [
          {
            title: 'menu.calendar',
            url: '/academic/education-calendar',
            requiredPermission: 'academic-calendars.read',
          },
          {
            title: 'menu.calendarManagement',
            url: '/academic/education-calendar/manage',
            requiredPermission: 'academic-calendars.create',
          },
        ],
      },
      {
        key: 'academic-classroom',
        title: 'menu.classroom',
        url: '#',
        icon: ClipboardList,
        items: [
          {
            title: 'menu.gradeLevel',
            url: '/academic/grade',
            requiredPermission: 'classrooms.update',
          },
          {
            title: 'menu.classroomList',
            url: '/academic/classroom',
            requiredPermission: 'classrooms.read',
          },
        ],
      },
      {
        key: 'academic-teaching',
        title: 'menu.teaching',
        url: '#',
        icon: BookOpen,
        items: [
          {
            title: 'menu.curriculum',
            url: '/academic/curriculum',
            requiredPermission: 'curricula.read',
          },
          {
            title: 'menu.subject',
            url: '/learning/subject',
            requiredPermission: 'subjects.read',
          },
          {
            title: 'menu.teachingAssignment',
            url: '/learning/teaching-assignment',
            requiredAnyPermission: [
              'teaching-assignments.read',
              'teaching-assignments.read-own',
            ],
          },
          {
            title: 'menu.timeSlot',
            url: '/learning/time-slot',
            requiredPermission: 'time-slots.update',
          },
          {
            title: 'menu.schedule',
            url: '/learning/lesson',
            requiredPermission: 'schedules.read',
          },
        ],
      },
    ],
  },

  {
    key: 'students',
    label: 'menu.section.students',
    requiredPermission: 'students.read',
    items: [
      {
        key: 'students-register',
        title: 'menu.studentRegister',
        url: '#',
        icon: Users,
        items: [
          {
            title: 'menu.studentList',
            url: '/student',
            requiredPermission: 'students.read',
          },
          {
            title: 'menu.studentAccounts',
            url: '/student/account',
            requiredPermission: 'users.read',
          },
          {
            title: 'menu.parent',
            url: '/data/parent',
            requiredPermission: 'parents.read',
          },
          {
            title: 'menu.parentRelation',
            url: '/data/parent-relation',
            requiredPermission: 'students.update',
          },
        ],
      },
      {
        key: 'students-graduation',
        title: 'menu.graduation',
        url: '#',
        icon: GraduationCap,
        items: [
          {
            title: 'menu.graduationRun',
            url: '/academic/graduation',
            requiredPermission: 'graduations.read',
          },
          {
            title: 'menu.alumni',
            url: '/student/alumni',
            requiredPermission: 'graduations.read',
          },
        ],
      },
    ],
  },

  {
    key: 'settings',
    label: 'menu.section.settings',
    requiredPermission: 'occupations.read',
    items: [
      {
        key: 'settings-reference-lists',
        title: 'menu.referenceLists',
        url: '#',
        icon: ClipboardList,
        items: REFERENCE_LISTS.map((list) => ({
          title: `menu.referenceList.${list.key}`,
          url: `/setting/${list.path}`,
          requiredPermission: `${list.path}.read`,
        })),
      },
      {
        key: 'settings-academic-ref',
        title: 'menu.academicData',
        url: '#',
        icon: ListChecks,
        items: [
          {
            title: 'menu.semesterType',
            url: '/setting/semester-type',
            requiredPermission: 'semesters.read',
          },
          {
            title: 'menu.weeklyHolidays',
            url: '/setting/weekly-holiday',
            requiredPermission: 'academic-settings.read',
          },
          {
            title: 'menu.passingScore',
            url: '/setting/passing-score',
            requiredPermission: 'academic-settings.read',
          },
          {
            title: 'menu.timeSlotType',
            url: '/setting/time-slot-type',
            requiredPermission: 'time-slots.read',
          },
          {
            title: 'menu.calendarType',
            url: '/setting/academic-calendar-type',
            requiredPermission: 'academic-calendar-types.read',
          },
        ],
      },
    ],
  },

  {
    key: 'student-view',
    label: 'menu.section.mine',
    requiredPermission: 'schedules.read-own',
    items: [
      {
        key: 'student-view-academic',
        title: 'menu.myAcademic',
        url: '#',
        icon: BookOpen,
        items: [
          {
            title: 'menu.schedule',
            url: '/academic/my/schedule',
            requiredPermission: 'schedules.read-own',
          },
          {
            title: 'menu.myClassroom',
            url: '/academic/my/classroom',
            requiredPermission: 'classrooms.read-own',
          },
          {
            title: 'menu.mySubjects',
            url: '/learning/my-subject',
            requiredPermission: 'classrooms.read-own',
          },
        ],
      },
    ],
  },
]
