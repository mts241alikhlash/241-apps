import { z } from 'zod'

export interface PoolDefaults { max: number; timeoutMs: number }

const positiveInt = z.coerce.number().int().min(1)

export function databasePoolShape(defaults: PoolDefaults) {
  return {
    DATABASE_POOL_MAX: positiveInt.default(defaults.max),
    DATABASE_POOL_TIMEOUT_MS: positiveInt.default(defaults.timeoutMs),
  }
}

export function pgPoolOptions(
  defaults: PoolDefaults,
  read: (key: string) => unknown,
): { max: number; connectionTimeoutMillis: number } {
  const env = z.object(databasePoolShape(defaults)).parse({
    DATABASE_POOL_MAX: read('DATABASE_POOL_MAX'),
    DATABASE_POOL_TIMEOUT_MS: read('DATABASE_POOL_TIMEOUT_MS'),
  })
  return {
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: env.DATABASE_POOL_TIMEOUT_MS,
  }
}
