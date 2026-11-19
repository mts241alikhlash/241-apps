import { describe, expect, it } from 'vitest'
import { deskPosition } from './seatDeskPosition'

describe('deskPosition', () => {
  it('snakes the 4-lane block of a 32-seat room', () => {
    expect(deskPosition(5, 4)).toEqual({ row: 2, lane: 4 })
    expect(deskPosition(8, 4)).toEqual({ row: 2, lane: 1 })
    expect(deskPosition(13, 4)).toEqual({ row: 4, lane: 4 })
    expect(deskPosition(16, 4)).toEqual({ row: 4, lane: 1 })
  })

  it('keeps the first row left to right', () => {
    expect([1, 2, 3, 4].map((index) => deskPosition(index, 4).lane)).toEqual([
      1, 2, 3, 4,
    ])
  })
})
