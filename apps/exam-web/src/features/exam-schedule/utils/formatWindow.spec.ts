import { describe, expect, it } from 'vitest'
import { formatWindow } from './formatWindow'
import { toInstant } from './instant'

describe('formatWindow', () => {
  it('shows the date and the start and end time in the local zone', () => {
    const text = formatWindow(
      toInstant('2026-11-02', '08:00'),
      toInstant('2026-11-02', '11:30'),
    )

    expect(text).toContain('2 November 2026')
    expect(text).toContain('08.00')
    expect(text).toContain('11.30')
  })
})
