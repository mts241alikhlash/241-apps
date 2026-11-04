import { describe, expect, it } from 'vitest'
import { fromInstant, toInstant } from './instant'

describe('toInstant and fromInstant', () => {
  it('turns a local date and time into a UTC instant', () => {
    const instant = toInstant('2026-11-02', '08:30')

    expect(instant.endsWith('Z')).toBe(true)
    expect(new Date(instant).getTime()).toBe(
      new Date(2026, 10, 2, 8, 30).getTime(),
    )
  })

  it('round-trips back to the same local date and time', () => {
    expect(fromInstant(toInstant('2026-11-02', '08:30'))).toEqual({
      date: '2026-11-02',
      time: '08:30',
    })
    expect(fromInstant(toInstant('2026-12-31', '23:59'))).toEqual({
      date: '2026-12-31',
      time: '23:59',
    })
  })

  it('pads single digit parts', () => {
    expect(fromInstant(toInstant('2026-01-05', '07:05'))).toEqual({
      date: '2026-01-05',
      time: '07:05',
    })
  })
})
