import { describe, expect, it } from 'vitest'
import { formatDateRange } from './formatDateRange'
import { toInstant } from './instant'

describe('formatDateRange', () => {
  it('shows the start and end dates in WIB', () => {
    expect(
      formatDateRange('2026-11-22T17:00:00.000Z', '2026-11-24T16:59:00.000Z'),
    ).toBe('23 Nov 2026 – 24 Nov 2026')
  })

  it('shows one date when start and end fall on the same WIB day', () => {
    expect(
      formatDateRange(
        toInstant('2026-11-23', '00:00'),
        toInstant('2026-11-23', '23:59'),
      ),
    ).toBe('23 Nov 2026')
  })
})
