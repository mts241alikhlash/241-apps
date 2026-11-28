import { databasePoolShape, pgPoolOptions } from './pg-pool.js'

const none = () => undefined
const defaults = { max: 12, timeoutMs: 4000 }

describe('pgPoolOptions', () => {
  it('returns the service defaults when unset', () => {
    expect(pgPoolOptions(defaults, none)).toEqual({
      max: 12,
      connectionTimeoutMillis: 4000,
    })
  })

  it('uses the per-service timeout default when unset', () => {
    expect(pgPoolOptions({ max: 8, timeoutMs: 3000 }, none)).toEqual({
      max: 8,
      connectionTimeoutMillis: 3000,
    })
  })

  it('reads both values from the environment reader', () => {
    const values: Record<string, string> = {
      DATABASE_POOL_MAX: '7',
      DATABASE_POOL_TIMEOUT_MS: '1500',
    }
    expect(pgPoolOptions(defaults, (key) => values[key])).toEqual({
      max: 7,
      connectionTimeoutMillis: 1500,
    })
  })

  it.each([['0'], ['-1'], ['2.5'], ['abc']])(
    'rejects %s as DATABASE_POOL_MAX',
    (value) => {
      expect(() =>
        pgPoolOptions(defaults, (key) =>
          key === 'DATABASE_POOL_MAX' ? value : undefined,
        ),
      ).toThrow()
    },
  )

  it('rejects a non-positive timeout', () => {
    expect(() =>
      pgPoolOptions(defaults, (key) =>
        key === 'DATABASE_POOL_TIMEOUT_MS' ? '0' : undefined,
      ),
    ).toThrow()
  })
})

describe('databasePoolShape', () => {
  it('validates the same keys with the given defaults', () => {
    const shape = databasePoolShape({ max: 3, timeoutMs: 3000 })
    expect(Object.keys(shape)).toEqual([
      'DATABASE_POOL_MAX',
      'DATABASE_POOL_TIMEOUT_MS',
    ])
    expect(shape.DATABASE_POOL_MAX.parse(undefined)).toBe(3)
    expect(shape.DATABASE_POOL_TIMEOUT_MS.parse(undefined)).toBe(3000)
  })
})
