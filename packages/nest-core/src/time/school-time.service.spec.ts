import type { ConfigService } from '@nestjs/config'
import { SchoolTimeService } from './school-time.service.js'

const config = {
  getOrThrow: () => 'Asia/Jakarta',
} as unknown as ConfigService

describe('SchoolTimeService', () => {
  it('derives today, month and minutes in the configured zone', () => {
    const service = new SchoolTimeService(config)
    const at = new Date('2026-11-05T23:45:00Z')
    expect(service.today(at).toISOString()).toBe('2026-11-06T00:00:00.000Z')
    expect(service.yearMonth(new Date('2026-11-30T23:30:00Z'))).toEqual({
      year: 2026,
      month: 12,
    })
    expect(service.minutesOfDay(at)).toBe(6 * 60 + 45)
  })

  it('bounds a day in instants', () => {
    const { from, to } = new SchoolTimeService(config).dayRange(
      new Date('2026-11-05T00:00:00Z'),
    )
    expect(from.toISOString()).toBe('2026-11-04T17:00:00.000Z')
    expect(to.toISOString()).toBe('2026-11-05T16:59:59.999Z')
  })
})
