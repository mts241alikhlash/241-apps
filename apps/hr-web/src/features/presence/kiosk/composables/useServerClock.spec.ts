import { afterEach, describe, expect, it, vi } from 'vitest'
import { useServerClock } from './useServerClock'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useServerClock', () => {
  it('requires a server anchor before deriving offline scan time', () => {
    const clock = useServerClock()

    expect(clock.deriveOccurredAt()).toBeNull()
    expect(clock.isAnchorStale()).toBe(true)
  })

  it('uses elapsed monotonic time, not changes in the device wall clock', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const clock = useServerClock()
    clock.setAnchor({
      anchorId: 'anchor-1',
      serverTime: '2026-10-07T07:00:00.000Z',
      maxOfflineWindowHours: 8,
    })

    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'))
    now += 30_000

    expect(clock.deriveOccurredAt()).toBe('2026-10-07T07:00:30.000Z')
  })

  it('expires only after the allowed offline window', () => {
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const clock = useServerClock()
    clock.setAnchor({
      anchorId: 'anchor-1',
      serverTime: '2026-10-07T07:00:00.000Z',
      maxOfflineWindowHours: 8,
    })

    now = 8 * 3_600_000
    expect(clock.isAnchorStale()).toBe(false)
    now += 1
    expect(clock.isAnchorStale()).toBe(true)
  })
})
