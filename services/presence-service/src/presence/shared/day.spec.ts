import { dayOf } from './day.js'

describe('dayOf', () => {
  it('keys a scan at 00:30 local time (17:30 UTC the day before) to the UTC day', () => {
    expect(dayOf(new Date('2026-11-05T17:30:00Z')).toISOString()).toBe(
      '2026-11-05T00:00:00.000Z',
    )
  })

  it('keys 00:30 UTC to the same UTC day', () => {
    expect(dayOf(new Date('2026-11-06T00:30:00Z')).toISOString()).toBe(
      '2026-11-06T00:00:00.000Z',
    )
  })
})
