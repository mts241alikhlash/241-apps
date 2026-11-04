export const SERVICE_PREFIXES = {
  identity: [
    '/auth',
    '/sso',
    '/users',
    '/profiles',
    '/religions',
    '/blood-types',
    '/regions',
  ],

  academic: ['/academic-years'],

  admission: ['/admissions'],
} as const satisfies Record<string, readonly string[]>

export type RoutedService = keyof typeof SERVICE_PREFIXES

export const UNROUTED_PREFIXES: readonly string[] = ['/settings']

export const HEALTH_ROUTES = [
  { path: '/health/identity', service: 'identity' },
  { path: '/health/academic', service: 'academic' },
  { path: '/health/admission', service: 'admission' },
] as const
