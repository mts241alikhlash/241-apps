export const SERVICE_PREFIXES = {
  identity: [
    '/auth',
    '/sso',
    '/profiles',
    '/school-unit-types',
    '/religions',
    '/blood-types',
    '/regions',
  ],

  inventory: [
    '/inventory',
  ],
} as const

export const UNROUTED_PREFIXES: readonly string[] = ['/settings']

export const HEALTH_ROUTES = [
  { path: '/health/identity', service: 'identity' },
  { path: '/health/inventory', service: 'inventory' },
] as const
