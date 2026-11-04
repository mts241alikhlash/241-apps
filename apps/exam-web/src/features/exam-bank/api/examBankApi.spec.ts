import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examBankApi } from './examBankApi'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@mts241alikhlash/web-shared/utils/api', () => ({
  default: { get },
}))

describe('examBankApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps an id inside its own path segment', () => {
    const hostile = '../../users/me?x=1#y'
    const safe = encodeURIComponent(hostile)

    void examBankApi.getImage(hostile)

    expect(get).toHaveBeenCalledTimes(1)
    const path = String(get.mock.calls[0][0])
    expect(path).toContain(safe)
    expect(path.slice(path.indexOf(safe)).replace(safe, '')).not.toMatch(/[?#]/)
    expect(safe).not.toMatch(/[/?#]/)
  })
})
