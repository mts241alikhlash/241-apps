import { describe, expect, it } from 'vitest'
import { createServerClock, secondsUntilSubmitAllowed } from './examClock'

describe('server clock', () => {
  it('follows the monotonic base, not the wall clock', () => {
    let monotonic = 1_000
    let wall = Date.parse('2026-11-01T01:00:00.000Z')
    const clock = createServerClock(
      () => monotonic,
      () => wall,
    )

    clock.sync('2026-11-01T01:00:00.000Z')
    expect(clock.now()).toBe(Date.parse('2026-11-01T01:00:00.000Z'))

    wall -= 2 * 60 * 60 * 1000
    monotonic += 30_000

    expect(clock.now()).toBe(Date.parse('2026-11-01T01:00:00.000Z') + 30_000)
  })

  it('falls back to the wall clock until the first sync', () => {
    const wall = Date.parse('2026-11-01T01:00:00.000Z')
    const clock = createServerClock(
      () => 0,
      () => wall,
    )

    expect(clock.now()).toBe(wall)
  })

  it('rebases on a later sync', () => {
    let monotonic = 0
    const clock = createServerClock(
      () => monotonic,
      () => 0,
    )

    clock.sync('2026-11-01T01:00:00.000Z')
    monotonic += 5_000
    clock.sync('2026-11-01T02:00:00.000Z')
    monotonic += 2_000

    expect(clock.now()).toBe(Date.parse('2026-11-01T02:00:00.000Z') + 2_000)
  })

  it('ignores an unparseable server time', () => {
    const clock = createServerClock(
      () => 0,
      () => 5_000,
    )

    clock.sync('not-a-date')

    expect(clock.now()).toBe(5_000)
  })
})

describe('minimum submit gate', () => {
  const startedAt = '2026-11-01T01:00:00.000Z'
  const deadline = Date.parse('2026-11-01T02:30:00.000Z')

  it('counts down to the earliest submit time', () => {
    expect(
      secondsUntilSubmitAllowed(
        startedAt,
        20,
        deadline,
        Date.parse('2026-11-01T01:05:00.000Z'),
      ),
    ).toBe(900)
  })

  it('is zero once the minimum has passed', () => {
    expect(
      secondsUntilSubmitAllowed(
        startedAt,
        20,
        deadline,
        Date.parse('2026-11-01T01:25:00.000Z'),
      ),
    ).toBe(0)
  })

  it('is clamped by the deadline', () => {
    expect(
      secondsUntilSubmitAllowed(
        startedAt,
        20,
        Date.parse('2026-11-01T01:05:00.000Z'),
        Date.parse('2026-11-01T01:00:00.000Z'),
      ),
    ).toBe(300)
  })

  it('is zero when the schedule sets no minimum', () => {
    expect(secondsUntilSubmitAllowed(startedAt, 0, deadline, 0)).toBe(0)
  })
})
