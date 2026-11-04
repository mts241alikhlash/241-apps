import { describe, expect, it } from 'vitest'
import { scoreStanding } from './scoreStanding'

describe('scoreStanding', () => {
  it('compares against the school’s mark, not a fixed one', () => {
    expect(scoreStanding(74, 70)).toBe('at-or-above')
    expect(scoreStanding(74, 75)).toBe('below')
  })

  it('counts the mark itself as passing', () => {
    expect(scoreStanding(75, 75)).toBe('at-or-above')
  })

  it('says nothing about a student with no average', () => {
    expect(scoreStanding(null, 75)).toBe('unknown')
    expect(scoreStanding(undefined, 75)).toBe('unknown')
  })

  it('says nothing when the school’s mark has not arrived', () => {
    expect(scoreStanding(80, null)).toBe('unknown')
    expect(scoreStanding(80, undefined)).toBe('unknown')
  })

  it('treats a zero average as a real score', () => {
    expect(scoreStanding(0, 75)).toBe('below')
  })
})
