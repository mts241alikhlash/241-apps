import { describe, expect, it } from 'vitest'
import {
  addMinutes,
  durationBetween,
  shiftEndWithStart,
  toMinutes,
} from './time-of-day'

describe('toMinutes', () => {
  it('reads a well-formed clock time', () => {
    expect(toMinutes('07:00')).toBe(420)
    expect(toMinutes('00:00')).toBe(0)
    expect(toMinutes('23:59')).toBe(1439)
  })

  it('refuses anything an <input type="time"> would never produce', () => {
    expect(toMinutes('')).toBeNull()
    expect(toMinutes('7:00')).toBeNull()
    expect(toMinutes('24:00')).toBeNull()
    expect(toMinutes('12:60')).toBeNull()
  })
})

describe('addMinutes', () => {
  it('advances across the hour', () => {
    expect(addMinutes('07:00', 40)).toBe('07:40')
    expect(addMinutes('07:40', 40)).toBe('08:20')
  })

  it('leaves an unreadable time alone rather than inventing one', () => {
    expect(addMinutes('', 40)).toBe('')
  })

  it('wraps past midnight instead of producing 25:00', () => {
    expect(addMinutes('23:30', 45)).toBe('00:15')
  })
})

describe('durationBetween', () => {
  it('measures an ordinary slot', () => {
    expect(durationBetween('07:00', '07:40')).toBe(40)
  })

  it('reads an end before the start as crossing midnight', () => {
    expect(durationBetween('23:30', '00:15')).toBe(45)
  })

  it('is null when either side is unreadable', () => {
    expect(durationBetween('07:00', '')).toBeNull()
  })
})

describe('shiftEndWithStart', () => {
  it('moves the end by as much as the start moved, keeping the length', () => {
    expect(shiftEndWithStart('07:00', '07:15', '07:40')).toBe('07:55')
  })

  it('keeps a length the operator typed by hand rather than resetting it', () => {
    expect(shiftEndWithStart('07:00', '08:00', '07:35')).toBe('08:35')
  })

  it('leaves the end alone when there is nothing to measure', () => {
    expect(shiftEndWithStart('07:00', '', '07:40')).toBe('07:40')
    expect(shiftEndWithStart('07:00', '08:00', '')).toBe('')
  })
})
