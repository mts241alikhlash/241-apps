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

  exam: [
    '/exam-activities',
    '/exam-events',
    '/exam-rooms',
    '/exam-files',
    '/exam-grading',
    '/exam-imports',
    '/exam-packages',
    '/exam-policy-presets',
    '/exam-questions',
    '/exam-schedules',
    '/exam-sessions',
    '/me/exams',
    '/seb-configs',
    '/public/seb-configs',
    '/student-exams',
  ],

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
  { path: '/health/exam', service: 'exam' },
  { path: '/health/academic', service: 'academic' },
  { path: '/health/student', service: 'student' },
] as const
