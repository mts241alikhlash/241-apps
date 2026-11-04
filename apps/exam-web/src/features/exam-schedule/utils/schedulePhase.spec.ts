import { describe, expect, it } from 'vitest'
import { schedulePhase } from './schedulePhase'

const base = {
  startsAt: '2026-11-02T01:00:00.000Z',
  endsAt: '2026-11-02T04:00:00.000Z',
  status: 'SCHEDULED' as const,
}

describe('schedulePhase', () => {
  it('is upcoming before the window opens', () => {
    expect(schedulePhase(base, new Date('2026-11-02T00:59:59.000Z'))).toBe(
      'UPCOMING',
    )
  })

  it('is running from the start up to the end', () => {
    expect(schedulePhase(base, new Date('2026-11-02T01:00:00.000Z'))).toBe(
      'RUNNING',
    )
    expect(schedulePhase(base, new Date('2026-11-02T03:59:59.000Z'))).toBe(
      'RUNNING',
    )
  })

  it('has ended from the closing time on', () => {
    expect(schedulePhase(base, new Date('2026-11-02T04:00:00.000Z'))).toBe(
      'ENDED',
    )
  })

  it('stays cancelled whatever the clock says', () => {
    expect(
      schedulePhase(
        { ...base, status: 'CANCELLED' },
        new Date('2026-11-02T02:00:00.000Z'),
      ),
    ).toBe('CANCELLED')
  })
})
