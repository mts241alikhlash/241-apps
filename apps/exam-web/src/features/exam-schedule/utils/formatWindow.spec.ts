import { describe, expect, it } from 'vitest'
import { formatWindow } from './formatWindow'
import { toInstant } from './instant'

describe('formatWindow', () => {
  it('shows one day when start and end fall on the same WIB day', () => {
    const text = formatWindow(
      toInstant('2026-11-12', '08:00'),
      toInstant('2026-11-12', '15:00'),
    )

    expect(text).toBe('12 Nov 08:00 – 15:00 WIB')
  })

  it('shows both days when the window crosses midnight in WIB', () => {
    const text = formatWindow(
      toInstant('2026-11-12', '08:00'),
      toInstant('2026-11-14', '15:00'),
    )

    expect(text).toBe('12 Nov 08:00 – 14 Nov 15:00 WIB')
  })
})
