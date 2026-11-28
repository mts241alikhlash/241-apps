import { z } from 'zod'

const DEFAULT_POOL_TIMEOUT_MS = 4000

const positiveInt = z.coerce.number().int().min(1)

export function databasePoolShape(defaultMax: number) {
  return {
    DATABASE_POOL_MAX: positiveInt.default(defaultMax),
    DATABASE_POOL_TIMEOUT_MS: positiveInt.default(DEFAULT_POOL_TIMEOUT_MS),
  }
}

export function pgPoolOptions(
  defaultMax: number,
  read: (key: string) => unknown,
): { max: number; connectionTimeoutMillis: number } {
  const env = z.object(databasePoolShape(defaultMax)).parse({
    DATABASE_POOL_MAX: read('DATABASE_POOL_MAX'),
    DATABASE_POOL_TIMEOUT_MS: read('DATABASE_POOL_TIMEOUT_MS'),
  })
  return {
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: env.DATABASE_POOL_TIMEOUT_MS,
  }
}
