import { describe, expect, it } from 'vitest'
import { fromInstant, toInstant } from './instant'

describe('toInstant and fromInstant', () => {
  it('reads the date and time as WIB (+07:00) into a UTC instant', () => {
    expect(toInstant('2026-11-12', '08:00')).toBe('2026-11-12T01:00:00.000Z')
  })

  it('ignores the browser zone', () => {
    const previous = process.env.TZ
    process.env.TZ = 'America/New_York'
    try {
      expect(toInstant('2026-11-12', '08:00')).toBe('2026-11-12T01:00:00.000Z')
      expect(fromInstant('2026-11-12T01:00:00.000Z')).toEqual({
        date: '2026-11-12',
        time: '08:00',
      })
    } finally {
      if (previous === undefined) {
        delete process.env.TZ
      } else {
        process.env.TZ = previous
      }
    }
  })

  it('round-trips back to the same WIB date and time', () => {
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
