import { databasePoolShape, pgPoolOptions } from './pg-pool.js'

const none = () => undefined

describe('pgPoolOptions', () => {
  it('returns the service default and 4000 ms timeout when unset', () => {
    expect(pgPoolOptions(12, none)).toEqual({
      max: 12,
      connectionTimeoutMillis: 4000,
    })
  })

  it('reads both values from the environment reader', () => {
    const values: Record<string, string> = {
      DATABASE_POOL_MAX: '7',
      DATABASE_POOL_TIMEOUT_MS: '1500',
    }
    expect(pgPoolOptions(12, (key) => values[key])).toEqual({
      max: 7,
      connectionTimeoutMillis: 1500,
    })
  })

  it.each([['0'], ['-1'], ['2.5'], ['abc']])(
    'rejects %s as DATABASE_POOL_MAX',
    (value) => {
      expect(() =>
        pgPoolOptions(12, (key) =>
          key === 'DATABASE_POOL_MAX' ? value : undefined,
        ),
      ).toThrow()
    },
  )

  it('rejects a non-positive timeout', () => {
    expect(() =>
      pgPoolOptions(12, (key) =>
        key === 'DATABASE_POOL_TIMEOUT_MS' ? '0' : undefined,
      ),
    ).toThrow()
  })
})

describe('databasePoolShape', () => {
  it('validates the same keys with the given default', () => {
    const shape = databasePoolShape(3)
    expect(Object.keys(shape)).toEqual([
      'DATABASE_POOL_MAX',
      'DATABASE_POOL_TIMEOUT_MS',
    ])
    expect(shape.DATABASE_POOL_MAX.parse(undefined)).toBe(3)
  })
})
