
export const SERVICE_PREFIXES = {
  identity: [
    '/auth',
    '/sso',
    '/sessions',
    '/users',
    '/accounts',
    '/profiles',
    '/roles',
    '/permissions',
    '/audit-logs',
    '/school-units',
    '/school-unit-addresses',
    '/school-unit-social-medias',
    '/school-unit-types',
    '/religions',
    '/blood-types',
    '/regions',
  ],

  academic: [
    '/academic-settings',
    '/academic-years',
    '/academic-calendars',
    '/academic-calendar-types',
    '/classrooms',
    '/classroom-structures',
    '/classroom-supervisors',
    '/curricula',
    '/curriculum-subjects',
    '/grades',
    '/grade-academic-years',
    '/occupations',
    '/schedules',
    '/semesters',
    '/semester-rollovers',
    '/semester-types',
    '/subjects',
    '/teaching-assignments',
    '/time-slots',
  ],

  student: [
    '/students',
    '/student-enrollments',
    '/student-parents',
    '/student-graduations',
    '/student-promotions',
    '/parents',
  ],

  hr: ['/employees'],
} as const satisfies Record<string, readonly string[]>

export type RoutedService = keyof typeof SERVICE_PREFIXES

export const UNROUTED_PREFIXES: readonly string[] = []

export const HEALTH_ROUTES = [
  { path: '/health/identity', service: 'identity' },
  { path: '/health/academic', service: 'academic' },
  { path: '/health/student', service: 'student' },
  { path: '/health/hr', service: 'hr' },
] as const
