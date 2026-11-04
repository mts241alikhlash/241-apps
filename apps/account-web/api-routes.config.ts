export const SERVICE_PREFIXES = {
  identity: ['/auth', '/sso', '/profiles', '/religions', '/blood-types', '/regions'],
} as const

export const UNROUTED_PREFIXES: readonly string[] = []

export const HEALTH_ROUTES = [
  { path: '/health/identity', service: 'identity' },
] as const
