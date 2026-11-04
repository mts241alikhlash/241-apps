export const SERVICE_PREFIXES = {
  identity: [
    '/auth',
    '/sso',
    '/users',
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

  portal: [
    '/files',
  ],

  inventory: [
    '/inventory/workflows/role-usage',
  ],
} as const

export const UNROUTED_PREFIXES: readonly string[] = []

export const HEALTH_ROUTES = [
  { path: '/health/identity', service: 'identity' },
  { path: '/health/portal', service: 'portal' },
] as const
