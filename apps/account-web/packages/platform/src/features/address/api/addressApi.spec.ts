import { afterEach, describe, expect, it, vi } from 'vitest'

const { getCalls } = vi.hoisted(() => ({ getCalls: [] as unknown[][] }))

import { addressApi } from './addressApi'

vi.mock('@mts241alikhlash/web-shared/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => {
      getCalls.push(args)
      return Promise.resolve({ data: { data: [] } })
    },
  },
}))

afterEach(() => getCalls.splice(0))

describe('addressApi region reads', () => {
  it('reads the province list from identity', async () => {
    await addressApi.getProvinces()
    expect(getCalls).toEqual([['/regions/provinces']])
  })

  it('encodes a parent region code for child lookup', async () => {
    await addressApi.getRegionChildren('32.04/01')
    expect(getCalls).toEqual([['/regions/32.04%2F01/children']])
  })
})
