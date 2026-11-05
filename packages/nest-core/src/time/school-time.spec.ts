import {
  schoolDate,
  schoolDayRange,
  schoolTimeZone,
  schoolYearMonth,
} from './school-time.js'

const ZONE = 'Asia/Jakarta'

describe('schoolDate', () => {
  it('keys 23:45 UTC the day before to the next local day', () => {
    expect(
      schoolDate(new Date('2026-11-04T23:45:00Z'), ZONE).toISOString(),
    ).toBe('2026-11-05T00:00:00.000Z')
  })

  it('keeps 16:59:59 UTC on the 5th and moves 17:00:00 UTC to the 6th', () => {
    expect(
      schoolDate(new Date('2026-11-05T16:59:59Z'), ZONE).toISOString(),
    ).toBe('2026-11-05T00:00:00.000Z')
    expect(
      schoolDate(new Date('2026-11-05T17:00:00Z'), ZONE).toISOString(),
    ).toBe('2026-11-06T00:00:00.000Z')
  })

  it('puts 06:45 local on its own day', () => {
    expect(
      schoolDate(new Date('2026-11-05T23:45:00Z'), ZONE).toISOString(),
    ).toBe('2026-11-06T00:00:00.000Z')
  })
})

describe('schoolYearMonth', () => {
  it('rolls into December when the local month has turned', () => {
    expect(schoolYearMonth(new Date('2026-11-30T23:30:00Z'), ZONE)).toEqual({
      year: 2026,
      month: 12,
    })
  })

  it('picks the new month at 2026-12-01T06:30+07:00', () => {
    expect(
      schoolYearMonth(new Date('2026-12-01T06:30:00+07:00'), ZONE),
    ).toEqual({ year: 2026, month: 12 })
  })
})

describe('schoolDayRange', () => {
  it('bounds the local day in instants', () => {
    const { from, to } = schoolDayRange(new Date('2026-11-05T00:00:00Z'), ZONE)
    expect(from.toISOString()).toBe('2026-11-04T17:00:00.000Z')
    expect(to.toISOString()).toBe('2026-11-05T16:59:59.999Z')
  })
})

describe('schoolTimeZone', () => {
  it('accepts an IANA zone and rejects an unknown one', () => {
    expect(schoolTimeZone.safeParse('Asia/Jakarta').success).toBe(true)
    expect(schoolTimeZone.safeParse('Mars/Base').success).toBe(false)
  })
})
