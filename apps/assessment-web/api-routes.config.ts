export const SERVICE_PREFIXES = {
  identity: [
    '/auth',
    '/sso',
    '/users',
    '/profiles',
    '/roles',
    '/permissions',
    '/school-units',
    '/religions',
    '/blood-types',
    '/regions',
  ],

  assessment: [
    '/assessment-items',
    '/assessment-weights',
    '/attendances',
    '/dashboards',
    '/exam-scores',
    '/rapors',
    '/student-scores',
  ],

  exam: ['/me/exams', '/student-exams'],

  academic: [
    '/academic-years',
    '/classrooms',
    '/grades',
    '/semesters',
    '/subjects',
    '/teaching-assignments',
  ],

  student: ['/students', '/student-enrollments'],
} as const satisfies Record<string, readonly string[]>

export type RoutedService = keyof typeof SERVICE_PREFIXES

export const UNROUTED_PREFIXES: readonly string[] = []

export const HEALTH_ROUTES = [
  { path: '/health/identity', service: 'identity' },
  { path: '/health/assessment', service: 'assessment' },
  { path: '/health/academic', service: 'academic' },
  { path: '/health/student', service: 'student' },
] as const
